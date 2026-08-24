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
