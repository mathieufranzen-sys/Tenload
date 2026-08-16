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

export interface EntreeCoach {
  pain: PainMap
  byDate: Record<string, { idx: number }>
  now: string
  /** Séances prévues et réalisées de la semaine en cours. */
  seancesTotal: { prevu: number; realise: number }
}

export function motDuCoach({ pain, byDate, now, seancesTotal }: EntreeCoach): MotCoach {
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
            ? `Bien joué. Ton excentrique ${excentrique} jours sur les 28 derniers a payé : ta raideur au réveil est passée ${chiffres}.`
            : `Ça descend. Ta raideur au réveil est passée ${chiffres} en deux semaines. Continue exactement comme ça.`,
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
        texte: `Raideur au réveil stable à ${formatNumber(b)} sur dix, avec l'excentrique fait ${excentrique} jours sur 28. C'est exactement ce qu'on cherche : de la charge encaissée sans que le tendon proteste.`,
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
      texte: `Ton indice de charge moyen est passé de ${Math.round(idxAvant)} à ${Math.round(idxRecent)} en une semaine. Le tendon récupère plus vite qu'il ne se charge.`,
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
