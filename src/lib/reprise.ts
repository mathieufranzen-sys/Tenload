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
 *
 * **Une douleur de fond est aussi un épisode** (arbitré par Mathieu le
 * 1er octobre 2026). Trois matins de suite qui ne sont pas calmes, sans
 * aucun relevé à 4, font une alerte : l'intensité attend trois matins calmes,
 * la course reste. Sans cette règle, un tendon à 3 tous les matins recevait
 * le plan entier, puisque seuls les planchers de l'indice ouvraient un
 * épisode. Silbernagel et Crossley (2015) demandent 2 ou moins avant de
 * reprendre la course et les sauts.
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
  mesure: 'réveil' | 'effort' | 'fin de journée' | 'douleur de fond'
  valeur: number
}

/** Matins non calmes d'affilée qui font une alerte de fond. */
export const MATINS_DE_FOND = 3

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
 * exigent un vrai relevé : un réveil non saisi est `inconnu`, il ne compte
 * pas, mais il ne remet pas non plus le compteur à zéro. Un seul oubli
 * suspendait sinon la course pour un épisode vieux d'un mois (retour de
 * Mathieu, 30 septembre 2026 : un pic le 25 août, la course passait au vélo
 * chaque matin tant que la raideur n'était pas saisie).
 */
function matinCalme(m: string, lire: ReturnType<typeof lecteur>, now: string): 'calme' | 'agite' | 'inconnu' {
  const veille = addDays(m, -1)
  const soir = lire(veille, 'evening')
  const effort = lire(veille, 'effort')
  if (soir != null && soir > SEUIL_SANS_DOULEUR) return 'agite'
  if (effort != null && effort > EFFORT_TOLERE) return 'agite'
  const reveil = lire(m, 'wake')
  if (reveil == null) return m > now ? 'calme' : 'inconnu'
  return reveil <= reveilCalme(m, lire) ? 'calme' : 'agite'
}

/**
 * Le verdict du lendemain d'une séance, sur la même définition du matin
 * calme. Sert au renfo : la charge ne monte que si le tendon a passé la nuit.
 * Un lendemain encore à venir est `inconnu` ici, jamais supposé calme : on
 * ne monte pas une charge sur une projection.
 */
export function lendemainCalme(pain: PainMap, jour: string, now: string): 'calme' | 'agite' | 'inconnu' {
  const m = addDays(jour, 1)
  if (m > now) return 'inconnu'
  return matinCalme(m, lecteur(pain, m, now), now)
}

/**
 * Le réveil calme : 2, ou jusqu'à 2,5 si c'est la raideur habituelle.
 *
 * Arbitré par Mathieu le 29 septembre 2026. Un seuil fixe à 2 bloquait la
 * course pour de bon d'un tendon dont la raideur de fond s'est installée
 * juste au-dessus : le profil 2 du laboratoire ne courait plus depuis trois
 * semaines. La raideur habituelle est la moyenne des réveils des quatre
 * semaines précédentes, sur dix relevés au moins ; elle ne desserre le seuil
 * que jusqu'à 2,5, jamais plus. Au-delà, ce n'est plus une base, c'est un
 * tendon qui n'est pas revenu au calme.
 */
export const REVEIL_CALME_MAX = 2.5
const FENETRE_HABITUELLE = 28
const RELEVES_HABITUELS = 10

function reveilCalme(m: string, lire: ReturnType<typeof lecteur>): number {
  const vs: number[] = []
  for (let k = 1; k <= FENETRE_HABITUELLE; k++) {
    const w = lire(addDays(m, -k), 'wake')
    if (w != null) vs.push(w)
  }
  if (vs.length < RELEVES_HABITUELS) return SEUIL_SANS_DOULEUR
  const habituelle = vs.reduce((a, b) => a + b, 0) / vs.length
  return Math.min(REVEIL_CALME_MAX, Math.max(SEUIL_SANS_DOULEUR, habituelle))
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
 * Trois matins de suite qui ne sont pas calmes, jusqu'au matin de `d` : une
 * alerte de fond. Un matin sans relevé ne compte ni pour ni contre, comme
 * partout : il interrompt la série.
 */
function episodeDeFond(d: string, lire: ReturnType<typeof lecteur>, now: string): Episode | null {
  let pire = 0
  for (let k = 0; k < MATINS_DE_FOND; k++) {
    const m = addDays(d, -k)
    if (matinCalme(m, lire, now) !== 'agite') return null
    pire = Math.max(pire, lire(m, 'wake') ?? 0, lire(addDays(m, -1), 'evening') ?? 0)
  }
  return { niveau: 'alerte', jour: d, mesure: 'douleur de fond', valeur: pire }
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
    const d = addDays(jour, -k)
    const e = episodeDu(d, lire) ?? episodeDeFond(d, lire, now)
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
    // Matins calmes d'affilée depuis l'épisode, jusqu'au matin de `jour`. Un
    // palier atteint est acquis : un réveil à 3 un mois plus tard ne rouvre
    // pas une crise dont la reprise était faite, il n'est pas un épisode.
    const { course: pourCourse, intensite: pourIntensite } = REPRISE[n]
    let calmes = 0
    let courseRendue = pourCourse === 0
    let intensiteRendue = false
    for (let m = addDays(e.jour, 1); m <= jour; m = addDays(m, 1)) {
      const etat = matinCalme(m, lire, now)
      if (etat === 'agite') calmes = 0
      else if (etat === 'calme') calmes++
      courseRendue ||= calmes >= pourCourse
      intensiteRendue ||= calmes >= pourIntensite
      if (intensiteRendue) break
    }
    const bloqueCourse = !courseRendue
    const bloqueIntensite = !intensiteRendue
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
  if (e.mesure === 'douleur de fond') return `douleur au-dessus de 2 trois matins de suite, jusqu’au ${jourCourt(e.jour)}`
  const quoi = e.mesure === 'effort' ? `douleur à ${nb(e.valeur)} pendant l'effort` : `${e.mesure} à ${nb(e.valeur)}`
  return `${quoi} le ${jourCourt(e.jour)}`
}

/** « 2 matins calmes sur 7 » : où en est le compteur de cette reprise. */
export const avancement = (etat: EtatReprise): string =>
  `${etat.calmes} matin${etat.calmes > 1 ? 's' : ''} calme${etat.calmes > 1 ? 's' : ''} sur ${etat.requis}`
