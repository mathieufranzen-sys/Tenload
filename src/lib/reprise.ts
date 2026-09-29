/**
 * La reprise après un épisode douloureux : ce que le tendon a dit reste en
 * mémoire tant que les jours calmes ne l'ont pas effacé.
 *
 * L'indice est un état du jour. Ses planchers tiennent le jour même et le
 * lendemain, puis relâchent : une douleur de 5 pendant la sortie longue du
 * lundi rendait le fractionné du jeudi, et un réveil à 6 rendait la course
 * deux jours plus tard (retours du laboratoire, 28 septembre 2026).
 *
 * **La reprise est graduée, et elle se lit sur des jours calmes, pas sur une
 * durée** (demande de Mathieu, 29 septembre 2026 : « plus longtemps ou plus
 * fort j'ai mal, plus fort et plus longtemps le plan s'adaptera »). Plus
 * l'épisode est fort, plus il faut de matins calmes ; plus il dure, plus tard
 * le compteur démarre, puisqu'il ne part que du dernier relevé douloureux.
 * C'est la logique du modèle de surveillance de la douleur (Silbernagel 2007) :
 * on progresse quand les symptômes sont revenus à leur niveau, pas à date fixe.
 *
 * | Épisode | Relevé qui le déclenche | Course | Intensité |
 * |---|---|---|---|
 * | Alerte | plancher orange de l'indice | permise | après 3 matins calmes |
 * | Crise | plancher rouge | après 2 matins calmes | après 7 matins calmes |
 * | Noir | plancher noir | après 3 matins calmes | après 14 matins calmes |
 *
 * - **L'intensité sort en premier et revient en dernier** (Cook et Purdam) :
 *   pendant sa pause, la qualité devient une course facile de même distance,
 *   et les allures rapides d'une sortie longue passent en endurance.
 * - **La course attend deux matins calmes après une crise** : c'est le
 *   critère de reprise de la course de Silbernagel et Crossley (2015), une
 *   douleur de la vie courante à 2 sur 10 ou moins.
 * - **Après une crise, un jour sans course sépare deux courses** tant que
 *   l'intensité est en pause : le collagène du tendon est en perte nette 24 à
 *   36 heures après une charge (Magnusson, Langberg et Kjær 2010). Pas après
 *   une simple alerte : Running Addict garde la fréquence et baisse le volume,
 *   et c'est le plafond de volume (`progression.ts`) qui s'en charge.
 *
 * Les nombres de matins sont une extrapolation de l'app, pas des chiffres des
 * sources : elles donnent le critère (revenir au calme), pas le délai.
 */
import { addDays } from './dates'
import { plancherDuReleve, type PainMap } from './tendonIndex'

/**
 * Le calme, mesure par mesure. Arbitré le 29 septembre 2026 : réveil et fin de
 * journée à 2 ou moins (Silbernagel et Crossley 2015), douleur d'effort
 * tolérée jusqu'à 3, sous le plancher orange qui commence à 4.
 */
export const SEUIL_SANS_DOULEUR = 2
export const EFFORT_TOLERE = 3

export type NiveauEpisode = 'alerte' | 'crise' | 'noir'

/** Matins calmes d'affilée qu'il faut pour rendre la course, puis l'intensité. */
export const REPRISE: Record<NiveauEpisode, { course: number; intensite: number }> = {
  alerte: { course: 0, intensite: 3 },
  crise: { course: 2, intensite: 7 },
  noir: { course: 3, intensite: 14 },
}

/** Au-delà, un épisode sans suite est oublié : c'était la durée de l'arrêt complet chez Silbernagel (2007). */
export const HORIZON_JOURS = 42

const ORDRE: NiveauEpisode[] = ['noir', 'crise', 'alerte']

export interface Episode {
  niveau: NiveauEpisode
  jour: string
  mesure: 'réveil' | 'effort' | 'fin de journée'
  valeur: number
}

export interface EtatReprise {
  courseSuspendue: boolean
  intensiteSuspendue: boolean
  /** Un jour sans course entre deux courses : après une crise, pendant la pause d'intensité. */
  alterner: boolean
  /** L'épisode qui pèse le plus ce jour-là. */
  episode: Episode
  /** Matins calmes d'affilée depuis cet épisode, et ceux qu'il faut. */
  calmes: number
  requis: number
  /** Premier jour où la contrainte tombera si les matins restent calmes. */
  levee: string
}

const niveauDu = (plancher: number): NiveauEpisode | null =>
  plancher >= 80 ? 'noir' : plancher >= 65 ? 'crise' : plancher >= 50 ? 'alerte' : null

const rang = (n: NiveauEpisode) => ORDRE.length - ORDRE.indexOf(n)

/**
 * Ce qu'on savait au moment de décider la séance de `jour` : le passé en
 * entier, et du jour lui-même seulement le réveil. Pour un jour à venir, tout
 * ce qui est saisi jusqu'à aujourd'hui.
 */
function lecteur(pain: PainMap, jour: string, now: string) {
  return (d: string, champ: 'wake' | 'effort' | 'evening'): number | null => {
    if (jour <= now) {
      if (d > jour) return null
      if (d === jour && champ !== 'wake') return null
    } else if (d > now) return null
    return pain[d]?.[champ] ?? null
  }
}

/**
 * Un matin calme : réveil à 2 ou moins, et la veille ni fin de journée
 * au-dessus de 2 ni effort au-dessus de 3. C'est ce qu'on sait au réveil.
 *
 * Un matin encore à venir est supposé calme, à moins que la veille déjà
 * saisie ne dise le contraire : la projection montre quand la contrainte
 * tombera SI les réveils restent calmes. Aujourd'hui et le passé, eux,
 * exigent un vrai relevé : on ne lève rien sur une absence de saisie.
 */
function matinCalme(m: string, lire: ReturnType<typeof lecteur>, now: string): boolean {
  const veille = addDays(m, -1)
  const soir = lire(veille, 'evening')
  const effort = lire(veille, 'effort')
  if (soir != null && soir > SEUIL_SANS_DOULEUR) return false
  if (effort != null && effort > EFFORT_TOLERE) return false
  const reveil = lire(m, 'wake')
  if (reveil == null) return m > now
  return reveil <= SEUIL_SANS_DOULEUR
}

/** Le relevé le plus sévère d'un jour, parmi ceux qu'on pouvait lire. */
function episodeDu(d: string, lire: ReturnType<typeof lecteur>): Episode | null {
  const candidats: Episode[] = []
  const r = lire(d, 'wake')
  if (r != null) {
    const n = niveauDu(plancherDuReleve(r, 'reveil'))
    if (n) candidats.push({ niveau: n, jour: d, mesure: 'réveil', valeur: r })
  }
  for (const [champ, mesure] of [['effort', 'effort'], ['evening', 'fin de journée']] as const) {
    const v = lire(d, champ)
    if (v == null) continue
    const n = niveauDu(plancherDuReleve(v, 'effort'))
    if (n) candidats.push({ niveau: n, jour: d, mesure, valeur: v })
  }
  if (!candidats.length) return null
  return candidats.sort((a, b) => rang(b.niveau) - rang(a.niveau) || b.valeur - a.valeur)[0]
}

/**
 * L'état de reprise pour la séance de `jour`, ou `null` si aucun épisode ne
 * pèse encore. Chaque niveau se lit sur SON dernier épisode : une crise d'il
 * y a dix jours peut encore retenir l'intensité quand l'alerte d'hier, elle,
 * n'en demande que trois matins.
 */
export function etatReprise(jour: string, pain: PainMap, now: string): EtatReprise | null {
  const lire = lecteur(pain, jour, now)

  // Le dernier épisode de chaque niveau ou plus, dans l'horizon.
  const dernier: Partial<Record<NiveauEpisode, Episode>> = {}
  for (let k = 0; k <= HORIZON_JOURS; k++) {
    const e = episodeDu(addDays(jour, -k), lire)
    if (!e) continue
    for (const n of ORDRE) if (rang(e.niveau) >= rang(n) && !dernier[n]) dernier[n] = e
    if (dernier.alerte && dernier.crise && dernier.noir) break
  }

  let course = false
  let intensite = false
  let alterner = false
  let pire: { episode: Episode; calmes: number; requis: number; levee: string } | null = null

  for (const n of ORDRE) {
    const e = dernier[n]
    if (!e) continue
    // Matins calmes d'affilée depuis l'épisode, jusqu'au matin de `jour`.
    let calmes = 0
    for (let m = addDays(e.jour, 1); m <= jour; m = addDays(m, 1)) {
      calmes = matinCalme(m, lire, now) ? calmes + 1 : 0
    }
    const { course: pourCourse, intensite: pourIntensite } = REPRISE[n]
    const bloqueCourse = calmes < pourCourse
    const bloqueIntensite = calmes < pourIntensite
    if (!bloqueCourse && !bloqueIntensite) continue
    course ||= bloqueCourse
    intensite ||= bloqueIntensite
    if (n !== 'alerte') alterner ||= bloqueIntensite
    const requis = bloqueCourse ? pourCourse : pourIntensite
    if (!pire || rang(n) > rang(pire.episode.niveau)) {
      pire = { episode: { ...e, niveau: n }, calmes, requis, levee: addDays(jour, requis - calmes) }
    }
  }

  if (!pire) return null
  return {
    courseSuspendue: course,
    intensiteSuspendue: intensite,
    alterner: alterner && !course,
    episode: pire.episode,
    calmes: pire.calmes,
    requis: pire.requis,
    levee: pire.levee,
  }
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const jourCourt = (iso: string) => `${Number(iso.slice(8, 10))} ${MOIS[Number(iso.slice(5, 7)) - 1]}`
const nb = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

/** « réveil à 6 le 24 sept. », pour les étiquettes et le coach. */
export function raisonEpisode(e: Episode): string {
  const quoi = e.mesure === 'effort' ? `douleur à ${nb(e.valeur)} pendant l'effort` : `${e.mesure} à ${nb(e.valeur)}`
  return `${quoi} le ${jourCourt(e.jour)}`
}

/** « 2 matins calmes sur 7 » : où en est le compteur de cette reprise. */
export const avancement = (etat: EtatReprise): string =>
  `${etat.calmes} matin${etat.calmes > 1 ? 's' : ''} calme${etat.calmes > 1 ? 's' : ''} sur ${etat.requis}`
