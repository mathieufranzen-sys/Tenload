/**
 * Le mot du coach, en bas de l'écran Aujourd'hui.
 *
 * Règle unique : ne jamais affirmer un chiffre qui n'est pas dans les données.
 * Un encouragement inventé se repère en une semaine et discrédite tout le
 * reste de l'app, y compris l'indice. Chaque message ci-dessous exige un
 * minimum de saisies avant de conclure ; sans ça, on dit qu'on ne sait pas
 * encore, ce qui est une information utile en soi.
 *
 * L'ordre des règles est un ordre de valeur : la douleur au réveil est le
 * marqueur de référence de la tendinopathie, elle passe donc avant l'observance
 * du protocole, qui passe avant l'indice, qui est un agrégat.
 */
import { addDays } from './dates'
import { formatNumber } from './dates'
import type { SessionType } from '../data/types'
import type { PainMap } from './tendonIndex'

export interface MotCoach {
  texte: string
  /** Décide de la couleur et de l'icône. */
  ton: 'bravo' | 'neutre' | 'vigilance'
}

/** Fenêtre glissante de saisies de raideur matinale, la plus récente d'abord. */
function reveils(pain: PainMap, fin: string, jours: number): number[] {
  const out: number[] = []
  for (let k = 0; k < jours; k++) {
    const v = pain[addDays(fin, -k)]?.wake
    if (v != null) out.push(v)
  }
  return out
}

const moyenne = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

/** Jours où le protocole excentrique a été fait, sur la fenêtre demandée. */
function joursExcentrique(pain: PainMap, fin: string, jours: number): number {
  let n = 0
  for (let k = 0; k < jours; k++) if (pain[addDays(fin, -k)]?.eccentric) n++
  return n
}

/** Moyenne de l'indice sur une fenêtre, null si la série ne la couvre pas. */
function indiceMoyen(
  byDate: Record<string, { idx: number }>,
  fin: string,
  jours: number,
): number | null {
  const vs: number[] = []
  for (let k = 0; k < jours; k++) {
    const r = byDate[addDays(fin, -k)]
    if (r) vs.push(r.idx)
  }
  return vs.length >= jours - 2 ? moyenne(vs) : null
}

/**
 * Une séance du jour, réduite à ce dont le coach a besoin pour en parler.
 *
 * `type` est ce qui sera vécu, `typePlan` ce que le plan de référence
 * prévoyait : c'est l'écart entre les deux qui porte l'information. Dire « tu
 * as du vélo » n'apprend rien, dire « ta sortie longue est devenue du vélo »
 * dit ce qui s'est passé et pourquoi il faut le lire.
 */
export interface SeanceDuJour {
  type: SessionType
  typePlan: SessionType
  titre: string
  /** Distance après écart, et celle que le plan fixait. En kilomètres. */
  dist: number | null
  distPlan: number | null
  /** Nature de l'écart volontaire de Mathieu, s'il y en a un. */
  ecart: 'saut' | 'remplacement' | 'deplacement' | 'donnee' | null
  /** L'indice de charge a changé la séance. */
  adaptee: boolean
  faite: boolean
  saute: boolean
}

export interface EntreeCoach {
  pain: PainMap
  byDate: Record<string, { idx: number }>
  now: string
  /** Séances prévues et réalisées de la semaine en cours. */
  seancesTotal: { prevu: number; realise: number }
  /** Ce qui est au programme aujourd'hui, écarts et adaptation compris. */
  duJour?: SeanceDuJour[]
  /** L'indice du jour, avec ses deux angles morts. */
  indice?: { idx: number; painInconnue: boolean; chargeInconnue: boolean }
  /** Les contraintes que la disposition réelle de la semaine ne respecte pas. */
  alertes?: string[]
}

const COURSE: SessionType[] = ['ef', 'long', 'tempo', 'inter', 'test', 'course', 'race']
const PLUS_DOUX: SessionType[] = ['velo', 'marche', 'repos']
/** Au-delà, l'indice commence à retirer des choses de lui-même. */
const INDICE_VIGILANCE = 50

/** Comment nommer une séance sans répéter son titre entier. */
function nomCourt(t: SessionType): string {
  if (t === 'long') return 'sortie longue'
  if (t === 'ef') return 'endurance facile'
  if (t === 'tempo' || t === 'inter' || t === 'test') return 'séance de qualité'
  if (t === 'course' || t === 'race') return 'course'
  if (t === 'velo') return 'vélo'
  if (t === 'marche') return 'marche'
  if (t === 'muscu-bas') return 'renfo bas du corps'
  if (t === 'muscu-haut') return 'renfo haut du corps'
  if (t === 'escalade') return 'escalade'
  return 'séance'
}

/** « du vélo », « de la marche », « ta séance de qualité ». */
const avecArticle = (t: SessionType): string => {
  const n = nomCourt(t)
  if (t === 'velo') return 'du vélo'
  if (t === 'repos') return 'du repos'
  if (t === 'marche') return 'de la marche'
  return `de l'${n}`.replace("de l'sortie", 'de la sortie').replace("de l'séance", 'de la séance')
}

/** « ta sortie longue de 26 km », quand le plan fixait une distance. */
const nomAvecKm = (t: SessionType, km: number | null): string =>
  km != null ? `${nomCourt(t)} de ${formatNumber(km)} km` : nomCourt(t)

/**
 * Ce que le coach dit de la séance du jour, quand il a quelque chose à en
 * dire. Vient AVANT tout le reste : un encouragement sur la raideur de la
 * quinzaine ne vaut rien le jour où le plan vient de retirer la course, ni le
 * jour où Mathieu a lui-même remplacé sa sortie longue.
 *
 * Les règles couvrent d'abord ce que l'INDICE a imposé, puis ce que MATHIEU a
 * décidé. Elles se déclenchaient au départ sur cinq cas trop étroits, tous
 * conditionnés à un indice haut ou à une contrainte cassée : à 27 sur 100,
 * changer une séance ne produisait donc aucun mot, ce qui est exactement le
 * moment où l'on veut en lire un.
 *
 * Même règle de silence qu'ailleurs. Le chiffre cité est toujours l'indice ou
 * la distance réellement calculés, et le fait cité est toujours un changement
 * réellement appliqué.
 */
function motSurLaSeance({ duJour, indice, alertes }: EntreeCoach): MotCoach | null {
  if (!duJour || !indice) return null
  const aTraiter = duJour.filter((x) => !x.faite)
  if (aTraiter.length === 0) return null
  const vivantes = aTraiter.filter((x) => !x.saute)

  // L'indice ne mesure plus tout : le citer comme un verdict serait le
  // présenter comme une mesure alors qu'il lui manque sa moitié.
  const surIndice = indice.painInconnue
    ? `indice à ${indice.idx} sur 100, calculé sans ta douleur qui n'est pas saisie`
    : `indice à ${indice.idx} sur 100`
  const bas = indice.idx < INDICE_VIGILANCE

  // ── 1. L'indice a retiré la course du jour ──────────────────────────────
  const neutralisee = vivantes.find(
    (x) => x.adaptee && COURSE.includes(x.typePlan) && !COURSE.includes(x.type),
  )
  if (neutralisee) {
    return {
      ton: 'vigilance',
      texte:
        neutralisee.type === 'repos'
          ? `Je ne te recommande rien sur les jambes aujourd'hui : ${surIndice}. Ta ${nomCourt(neutralisee.typePlan)} saute, mobilité de cheville et glaçage à la place. Trois jours ici et tu appelles ton kiné.`
          : `Je ne te recommande pas de courir aujourd'hui : ${surIndice}. Ta ${nomCourt(neutralisee.typePlan)} passe au vélo. Ce n'est pas une séance perdue, c'est le même volume aérobie sans impact au sol, et c'est ce qui raccourcit l'épisode plutôt que de le prolonger.`,
    }
  }

  // ── 2. L'indice a raccourci la sortie longue ────────────────────────────
  const raccourcie = vivantes.find((x) => x.adaptee && x.type === 'long')
  if (raccourcie) {
    return {
      ton: 'vigilance',
      texte: `Sortie longue raccourcie aujourd'hui par l'${surIndice} : ${nomAvecKm('long', raccourcie.dist)} au lieu de ${formatNumber(raccourcie.distPlan ?? 0)} km. Le kilométrage encaissé compte, celui qu'on paie trois jours ne compte pas.`,
    }
  }

  // ── 3. Un de tes écarts a cassé une contrainte de la semaine ────────────
  const modifiee = aTraiter.find((x) => x.ecart)
  if (modifiee && alertes && alertes.length > 0) {
    return {
      ton: 'vigilance',
      texte: `Attention à la semaine que tes changements ont formée : ${alertes[0].toLowerCase()} Rien ne t'en empêche, mais c'est une contrainte que ton tendon a posée, pas le plan.`,
    }
  }

  // ── 4. Tu as sauté la séance du jour ────────────────────────────────────
  const sautee = aTraiter.find((x) => x.saute && x.ecart === 'saut')
  if (sautee) {
    return {
      ton: 'neutre',
      texte: `Tu as sauté ${avecArticle(sautee.typePlan)} d'aujourd'hui. Elle ne compte pas dans la charge et le plan ne la rattrape pas : la semaine prochaine reprend là où elle devait. Une séance sautée vaut mieux qu'une séance forcée, mais deux de suite sur la même famille commencent à se voir en avril.`,
    }
  }

  // ── 5. Tu as remplacé la séance par autre chose ─────────────────────────
  const remplacee = vivantes.find((x) => x.ecart === 'remplacement' && x.type !== x.typePlan)
  if (remplacee) {
    const versDoux = COURSE.includes(remplacee.typePlan) && PLUS_DOUX.includes(remplacee.type)
    const versDur = PLUS_DOUX.includes(remplacee.typePlan) && COURSE.includes(remplacee.type)

    if (versDoux) {
      return bas
        ? {
            ton: 'neutre',
            texte: `Tu as remplacé ta ${nomAvecKm(remplacee.typePlan, remplacee.distPlan)} par ${avecArticle(remplacee.type)}. L'${surIndice} ne te le demandait pas, donc c'est ton ressenti qui tranche, et c'est le bon ordre. Ces kilomètres-là sortent du volume de la semaine : si tu peux, remets-les ailleurs plutôt que de les perdre.`,
          }
        : {
            ton: 'bravo',
            texte: `Bon réflexe : tu as remplacé ta ${nomCourt(remplacee.typePlan)} par ${avecArticle(remplacee.type)} avec un ${surIndice}. C'est exactement la décision que le plan aurait prise à ta place.`,
          }
    }

    if (versDur) {
      return {
        ton: 'vigilance',
        texte: `Tu as mis ${avecArticle(remplacee.type)} là où le plan mettait ${avecArticle(remplacee.typePlan)}${remplacee.dist != null ? `, soit ${formatNumber(remplacee.dist)} km d'impact en plus` : ''}. L'${surIndice}${bas ? ', le tendon peut l’encaisser' : ' est déjà haut'}, mais le vélo n'est pas là par hasard : il porte du volume aérobie sans choc au sol, et c'est ce qui te permet de courir le reste.`,
      }
    }

    return {
      ton: 'neutre',
      texte: `Tu as remplacé ta ${nomCourt(remplacee.typePlan)} du jour par ${avecArticle(remplacee.type)}. L'${surIndice}, la semaine tient ses contraintes.`,
    }
  }

  // ── 6. Tu as déplacé une séance jusqu'ici ───────────────────────────────
  const deplacee = vivantes.find((x) => x.ecart === 'deplacement')
  if (deplacee) {
    return {
      ton: 'neutre',
      texte: `Ta ${nomAvecKm(deplacee.type, deplacee.dist)} est arrivée sur aujourd'hui. Aucune contrainte de la semaine ne tombe, et l'${surIndice} : la journée est jouable telle que tu l'as posée.`,
    }
  }

  // ── 7. Tu as corrigé la distance ou la durée ────────────────────────────
  const corrigee = vivantes.find(
    (x) => x.ecart === 'donnee' && x.dist != null && x.distPlan != null && x.dist !== x.distPlan,
  )
  if (corrigee) {
    const plus = (corrigee.dist ?? 0) > (corrigee.distPlan ?? 0)
    return {
      ton: plus ? 'vigilance' : 'neutre',
      texte: `Tu as noté ${formatNumber(corrigee.dist ?? 0)} km sur ta ${nomCourt(corrigee.type)} au lieu des ${formatNumber(corrigee.distPlan ?? 0)} km prévus. ${
        plus
          ? "C'est du volume que le plan n'avait pas budgété : il entre dans la charge, et la sortie longue de la semaine prochaine se décidera dessus."
          : "La charge suit ce que tu as vraiment fait, pas ce qui était écrit."
      }`,
    }
  }

  // ── 8. La charge n'est plus attestée ────────────────────────────────────
  if (indice.chargeInconnue) {
    return {
      ton: 'vigilance',
      texte:
        "Trop de séances non notées cette semaine : la part mécanique de ton indice suppose plus qu'elle ne mesure, et elle se trompe toujours du côté rassurant. Note-les et je pourrai te dire quelque chose de ta séance du jour.",
    }
  }

  return null
}

export function motDuCoach(entree: EntreeCoach): MotCoach {
  const { pain, byDate, now, seancesTotal, duJour } = entree

  const surLaSeance = motSurLaSeance(entree)
  if (surLaSeance) return surLaSeance

  /** La séance du jour qui mérite qu'on l'encourage nommément. */
  const aVenir = (duJour ?? []).find(
    (x) => !x.faite && !x.saute && ['long', 'tempo', 'inter', 'test'].includes(x.type),
  )
  const relance = aVenir ? ` Tiens l'allure prévue sur ta ${nomCourt(aVenir.type)} d'aujourd'hui.` : ''

  const recent = reveils(pain, now, 14)
  const avant = reveils(pain, addDays(now, -14), 14)
  const excentrique = joursExcentrique(pain, now, 28)

  // ── La raideur au réveil, le marqueur de référence ──────────────────────
  // Quatre saisies de chaque côté au minimum : en dessous, une seule mauvaise
  // nuit déplacerait la moyenne et on annoncerait une tendance qui n'existe pas.
  if (recent.length >= 4 && avant.length >= 4) {
    const a = moyenne(avant)
    const b = moyenne(recent)
    const ecart = a - b

    if (ecart >= 0.4) {
      const chiffres = `de ${formatNumber(a)} à ${formatNumber(b)} sur dix`
      return {
        ton: 'bravo',
        texte:
          excentrique >= 8
            ? `Bien joué. Ton excentrique ${excentrique} jours sur les 28 derniers a payé : ta raideur au réveil est passée ${chiffres}.${relance}`
            : `Ça descend. Ta raideur au réveil est passée ${chiffres} en deux semaines. Continue exactement comme ça.${relance}`,
      }
    }

    if (ecart <= -0.4) {
      return {
        ton: 'vigilance',
        texte: `Ta raideur au réveil remonte, de ${formatNumber(a)} à ${formatNumber(b)} sur dix. Ce n'est pas encore une alerte, mais c'est le moment de ne rien forcer et de tenir l'excentrique.`,
      }
    }

    if (excentrique >= 12) {
      return {
        ton: 'bravo',
        texte: `Raideur au réveil stable à ${formatNumber(b)} sur dix, avec l'excentrique fait ${excentrique} jours sur 28. C'est exactement ce qu'on cherche : de la charge encaissée sans que le tendon proteste.${relance}`,
      }
    }

    return {
      ton: 'neutre',
      texte: `Raideur au réveil stable autour de ${formatNumber(b)} sur dix depuis un mois. Le tendon encaisse ce que tu lui donnes.`,
    }
  }

  // ── L'observance du protocole ───────────────────────────────────────────
  if (excentrique >= 8) {
    return {
      ton: 'bravo',
      texte: `Excentrique fait ${excentrique} jours sur les 28 derniers. C'est le seul geste qui répare vraiment le tendon, et c'est celui que tu tiens le mieux.`,
    }
  }

  // ── La régularité de la semaine ─────────────────────────────────────────
  if (seancesTotal.prevu >= 4 && seancesTotal.realise >= seancesTotal.prevu) {
    return {
      ton: 'bravo',
      texte: `Semaine complète : ${seancesTotal.realise} séances sur ${seancesTotal.prevu}. La régularité vaut mieux qu'une grosse sortie isolée, surtout sur un tendon en convalescence.`,
    }
  }

  // ── L'indice, en dernier recours : c'est un agrégat, pas une observation ─
  const idxRecent = indiceMoyen(byDate, now, 7)
  const idxAvant = indiceMoyen(byDate, addDays(now, -7), 7)
  if (idxRecent != null && idxAvant != null && idxAvant - idxRecent >= 3) {
    return {
      ton: 'bravo',
      texte: `Ton indice de charge moyen est passé de ${Math.round(idxAvant)} à ${Math.round(idxRecent)} en une semaine. Le tendon récupère plus vite qu'il ne se charge.${relance}`,
    }
  }

  return {
    ton: 'neutre',
    texte:
      'Note ta douleur au réveil chaque matin : c’est à partir de quatre semaines de saisies que le coach peut te dire si ça progresse vraiment.',
  }
}

/**
 * Ce que la séance travaille, et pourquoi ça fait avancer vers avril.
 *
 * Texte fixe, attaché au type : c'est de la physiologie, pas une lecture des
 * données, et la règle de silence de ce fichier ne s'y applique donc pas — il
 * n'y a aucun chiffre à inventer. La note du plan dit quoi faire ce jour-là ;
 * ceci dit à quoi ça sert, ce qui est la question qui revient à la troisième
 * séance de côtes.
 *
 * Les séances sans objet de progression clair (vélo, escalade, repos, renfo)
 * ne renvoient rien : un texte pour tout le monde ne veut plus rien dire.
 */
export function butDeLaSeance(type: SessionType): string | null {
  switch (type) {
    case 'inter':
      return "À quoi ça sert : ces répétitions courtes travaillent ta VO2max, le plafond d'oxygène que ton corps sait utiliser. Tu ne courras jamais le marathon à cette allure, mais plus le plafond est haut, plus ton allure cible se court bas dans la zone confortable."
    case 'tempo':
      return "À quoi ça sert : le seuil, c'est l'allure que tu tiendrais une heure à fond. La repousser rend ton allure marathon moins coûteuse à tenir, et c'est la séance qui déplace le plus le chrono d'avril."
    case 'long':
      return "À quoi ça sert : la sortie longue apprend à ton corps à puiser dans le gras plutôt que dans le sucre, et à ton tendon à encaisser la durée. C'est la durée qui compte ici, pas la vitesse."
    case 'ef':
      return "À quoi ça sert : l'endurance fondamentale construit le réseau capillaire et le cœur, sans coût pour le tendon. Courue trop vite, elle ne construit plus rien et fatigue quand même."
    case 'test':
      return "À quoi ça sert : ce test recalibre les allures des semaines qui suivent. Un chrono honnête vaut mieux qu'un beau chrono : tout le bloc suivant est réglé dessus."
    case 'course':
    case 'race':
      return "À quoi ça sert : une course en conditions réelles est le seul endroit où se travaillent le départ, le ravitaillement et la gestion de l'allure sous adrénaline. Le chrono est un résultat, la répétition générale est l'objectif."
    default:
      return null
  }
}
