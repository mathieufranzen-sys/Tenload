/**
 * Ce que la fonction `rappels` décide, sans rien qui touche au réseau.
 *
 * Séparé de `index.ts` pour être testable : `index.ts` importe Deno et le
 * paquet web-push, que vitest ne sait pas charger. Ici, du TypeScript nu.
 */

export const FUSEAU = 'Europe/Paris'
export const HEURE_MATIN = 8
export const HEURE_SOIR = 23
/**
 * Le bilan du dimanche, à 20 h : il se lit avant de préparer la semaine, pas
 * au moment de dormir, et il ne se mélange pas au point du soir de 23 h.
 */
export const HEURE_BILAN = 20

/** Lundi de la semaine 1 du plan, et sa durée. */
export const DEBUT_PLAN = '2026-08-10'
export const SEMAINES_PLAN = 35

/**
 * L'heure et la date à Paris, quel que soit le fuseau du serveur.
 *
 * pg_cron raisonne en UTC : un rappel calé sur UTC glisserait d'une heure à
 * chaque changement d'horaire. On réveille donc la fonction toutes les heures
 * et c'est ici qu'on décide si c'en est une.
 */
export function momentParis(maintenant: Date): { heure: number; jour: string } {
  const parties = new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU,
    hour: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).formatToParts(maintenant)
  const p = (t: string) => parties.find((x) => x.type === t)?.value ?? ''
  return { heure: Number(p('hour')), jour: `${p('year')}-${p('month')}-${p('day')}` }
}

export interface Journal {
  pain_wake: number | null
  pain_evening: number | null
}

/** Le dimanche est le repos jambes complet : aucune séance à noter. */
export function estDimanche(jour: string): boolean {
  return new Date(`${jour}T12:00:00Z`).getUTCDay() === 0
}

/**
 * Ce qu'il reste à saisir ce soir, dans l'ordre où l'écran le demande.
 *
 * `seanceAttendue` est faux le dimanche, seul jour dont on sait sans consulter
 * le plan qu'il ne porte rien. Un écart volontaire pourrait le démentir et le
 * rappel se tairait alors à tort : un rappel manquant vaut mieux qu'un rappel
 * faux, qui se fait couper au bout de trois jours et emporte avec lui celui
 * qui servait.
 */
export function manquantsDuSoir(
  journal: Journal | null,
  aUnRessenti: boolean,
  seanceAttendue: boolean,
): string[] {
  const out: string[] = []
  // L'effort et la douleur de séance partent dans la même ligne de base, donc
  // manquent toujours ensemble. Ils sont nommés séparément quand même : la
  // notification doit dire les trois curseurs à bouger, pas les deux écrans.
  if (seanceAttendue && !aUnRessenti) out.push('ton effort perçu', 'ta douleur à l’effort')
  if (journal?.pain_evening == null) out.push('ta douleur de fin de journée')
  return out
}

/** « a, b et c » : une notification n'a pas de puces. */
export function enumerer(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

export interface Message {
  titre: string
  corps: string
  tag: string
}

/**
 * Le message à envoyer, ou `null` s'il n'y a rien à rappeler. C'est la règle
 * unique : ne jamais redemander ce qui est déjà saisi.
 */
export function messageDuMoment(
  heure: number,
  jour: string,
  journal: Journal | null,
  aUnRessenti: boolean,
): Message | null {
  if (heure === HEURE_MATIN) {
    // Le seul rappel qui répare un angle mort du modèle : sans raideur au
    // réveil, la part douleur tombe à zéro et l'indice cesse de mesurer.
    if (journal?.pain_wake != null) return null
    return {
      titre: 'Raideur au réveil',
      corps: 'Note ta raideur avant de bouger. C’est la mesure qui pilote la journée.',
      tag: 'tenload-matin',
    }
  }

  if (heure === HEURE_SOIR) {
    const manquants = manquantsDuSoir(journal, aUnRessenti, !estDimanche(jour))
    if (!manquants.length) return null
    return {
      titre: 'Le point du soir',
      corps: `Il reste ${enumerer(manquants)}.`,
      tag: 'tenload-soir',
    }
  }

  return null
}

/** Une date ISO décalée de n jours, calée à midi UTC comme partout dans l'app. */
export function ajouterJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Le numéro de semaine du plan pour une date, ou `null` hors des 35 semaines. */
export function semaineDuPlan(jour: string): number | null {
  const jours = Math.round(
    (new Date(`${jour}T12:00:00Z`).getTime() - new Date(`${DEBUT_PLAN}T12:00:00Z`).getTime()) / 86_400_000,
  )
  const n = Math.floor(jours / 7) + 1
  return jours >= 0 && n <= SEMAINES_PLAN ? n : null
}

export interface ReleveBilan {
  day: string
  pain_wake: number | null
  eccentric: boolean
}

export interface DonneesBilan {
  /** Ressentis de séance saisis de lundi à dimanche. */
  notees: number
  /** Écarts « sautée » de la semaine du plan. */
  sautees: number
  /** Carnet du lundi de la semaine précédente à aujourd'hui. */
  releves: ReleveBilan[]
}

const virgule = (v: number): string => (Math.round(v * 10) / 10).toString().replace('.', ',')
const pluriel = (n: number, mot: string): string => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * La notification du bilan, le dimanche seulement.
 *
 * Elle ne porte que ce qui se lit en base : les séances prévues, la charge et
 * la semaine suivante demandent le plan et le modèle, qui vivent dans l'app.
 * Elle y renvoie donc, plutôt que d'approximer ici un chiffre que la carte
 * calcule juste. Même exigence qu'ailleurs : pas de moyenne de raideur sous
 * trois matins, et rien du tout si la semaine n'a laissé aucune trace.
 */
export function messageBilan(jour: string, d: DonneesBilan): Message | null {
  if (!estDimanche(jour)) return null
  const n = semaineDuPlan(jour)
  if (n == null) return null

  const lundi = ajouterJours(jour, -6)
  const cette = d.releves.filter((r) => r.day >= lundi && r.day <= jour)
  const avant = d.releves.filter((r) => r.day < lundi && r.day >= ajouterJours(lundi, -7))
  const reveils = (rs: ReleveBilan[]) => rs.map((r) => r.pain_wake).filter((v): v is number => v != null)
  const moyenne = (xs: number[]) => (xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  const raideur = moyenne(reveils(cette))
  const raideurAvant = moyenne(reveils(avant))
  const excentrique = cette.filter((r) => r.eccentric).length
  if (d.notees === 0 && d.sautees === 0 && raideur == null && excentrique === 0) return null

  const phrases = [
    `${pluriel(d.notees, 'séance')} ${d.notees > 1 ? 'notées' : 'notée'}${d.sautees ? `, ${d.sautees} ${d.sautees > 1 ? 'sautées' : 'sautée'}` : ''}.`,
  ]
  if (raideur != null) {
    phrases.push(
      `Raideur au réveil à ${virgule(raideur)}${raideurAvant != null ? `, contre ${virgule(raideurAvant)} la semaine d’avant` : ''}.`,
    )
  }
  phrases.push(`Excentrique ${pluriel(excentrique, 'jour')} sur 7.`)
  phrases.push('La charge et la semaine prochaine sont dans l’app.')

  return { titre: `Bilan de la semaine ${n}`, corps: phrases.join(' '), tag: 'tenload-bilan' }
}
