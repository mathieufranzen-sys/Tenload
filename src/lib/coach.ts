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
import { DAYS_LONG, addDays, daysBetween, formatDay, formatNumber, weekdayIndex } from './dates'
import { formatDuration, formatPace } from './paces'
import type { SessionType } from '../data/types'
import type { PainMap } from './tendonIndex'

export interface MotCoach {
  texte: string
  /** Décide de la couleur et de l'icône. */
  ton: 'bravo' | 'neutre' | 'vigilance'
  /** La règle qui l'a produit. */
  cle: string
  /**
   * Ce dont le message PARLE. C'est lui qu'on ne répète pas, et non la règle :
   * « raideur en baisse », « raideur stable » et « douleur sur le long terme »
   * sont trois règles distinctes qui disent toutes la même chose à Mathieu, et
   * il les a vues revenir tous les matins.
   */
  sujet: string
  /** Ce que l'indice impose se répète tant que c'est vrai. */
  obligatoire?: boolean
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
  /** Ce qui l'a changée : l'indice, ou la raideur du lendemain de sortie longue. */
  motif?: 'indice' | 'raideur'
  /** Raideur au réveil du jour, pour citer la valeur qui a coupé. */
  raideurMatin?: number | null
  faite: boolean
  saute: boolean
}

/** Une séance d'hier, déjà croisée avec ce que le plan en attendait. */
export interface SeanceHier {
  type: SessionType
  /** Effort perçu noté, et celui que ce type de séance appelle (`forme.ts`). */
  rpe: number | null
  rpeAttendu: number | null
  /** Douleur pendant l'effort. */
  douleur: number | null
  /** Durée saisie en « donnée réelle », en minutes. */
  dureeReelle: number | null
  /** Fourchette du plan de référence, jamais celle réécrite par l'écart. */
  dureeEstimee: [number, number] | null
}

/** La semaine en cours, en charge tendineuse. */
export interface SemaineEnCours {
  decharge: boolean
  /** Jours écoulés depuis lundi, aujourd'hui exclu. */
  joursEcoules: number
  /** Charge encaissée de lundi à hier. */
  realisee: number
  /** Charge que le plan de référence prévoyait sur ces mêmes jours. */
  prevue: number
  /** Charge projetée d'aujourd'hui à dimanche, écarts et adaptation compris. */
  reste: number
  /** Charge prévue de la dernière semaine de charge : ce qu'une décharge doit creuser. */
  referenceCharge: number | null
}

export interface EntreeCoach {
  pain: PainMap
  byDate: Record<string, { idx: number; load?: number }>
  now: string
  /** Séances prévues et réalisées de la semaine en cours. */
  seancesTotal: { prevu: number; realise: number }
  /** Ce qui est au programme aujourd'hui, écarts et adaptation compris. */
  duJour?: SeanceDuJour[]
  /** L'indice du jour, avec ses deux angles morts. */
  indice?: { idx: number; painInconnue: boolean; chargeInconnue: boolean }
  /** Les contraintes que la disposition réelle de la semaine ne respecte pas. */
  alertes?: string[]
  /**
   * Les sujets déjà servis les jours précédents, à ne pas resservir. Deux
   * jours de mémoire : un sujet ne revient donc qu'au bout de trois jours.
   */
  exclureSujets?: string[]
  /** Jours avant le marathon, pour le mot toujours disponible. */
  jusquaCourse?: number
  hier?: SeanceHier[]
  semaine?: SemaineEnCours
  /** Forme projetée par le ressenti, voir `forme.ts`. */
  forme?: { allure: number; ecart: number; seances: number }
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
 * Ce que le coach peut dire de la séance du jour, dans l'ordre où ça compte.
 * Vient AVANT tout le reste : un encouragement sur la raideur de la quinzaine
 * ne vaut rien le jour où le plan vient de retirer la course, ni le jour où
 * Mathieu a lui-même remplacé sa sortie longue.
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
function candidatsSeance({ duJour, indice, alertes }: EntreeCoach): MotCoach[] {
  const out: MotCoach[] = []
  if (!duJour || !indice) return out
  const aTraiter = duJour.filter((x) => !x.faite)
  if (aTraiter.length === 0) return out
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
    out.push({
      cle: 'course-neutralisee', sujet: 'seance',
      obligatoire: true,
      ton: 'vigilance',
      texte:
        neutralisee.motif === 'raideur' && neutralisee.raideurMatin != null
          ? `Pas de course aujourd'hui : ta raideur au réveil est à ${formatNumber(neutralisee.raideurMatin)} sur dix, le lendemain de ta sortie longue. Ta règle passe ta ${nomCourt(neutralisee.typePlan)} au vélo souple : la longue n'est pas digérée, et c'est au réveil que le tendon le dit.`
          : neutralisee.type === 'repos'
          ? `Je ne te recommande rien sur les jambes aujourd'hui : ${surIndice}. Ta ${nomCourt(neutralisee.typePlan)} saute, mobilité de cheville et glaçage à la place. Trois jours ici et tu appelles ton kiné.`
          : `Je ne te recommande pas de courir aujourd'hui : ${surIndice}. Ta ${nomCourt(neutralisee.typePlan)} passe au vélo. Ce n'est pas une séance perdue, c'est le même volume aérobie sans impact au sol, et c'est ce qui raccourcit l'épisode plutôt que de le prolonger.`,
    })
  }

  // ── 2. L'indice a raccourci la sortie longue ────────────────────────────
  const raccourcie = vivantes.find((x) => x.adaptee && x.type === 'long')
  if (raccourcie) {
    out.push({
      cle: 'longue-raccourcie', sujet: 'seance',
      obligatoire: true,
      ton: 'vigilance',
      texte: `Sortie longue raccourcie aujourd'hui par l'${surIndice} : ${nomAvecKm('long', raccourcie.dist)} au lieu de ${formatNumber(raccourcie.distPlan ?? 0)} km. Le kilométrage encaissé compte, celui qu'on paie trois jours ne compte pas.`,
    })
  }

  // ── 3. Un de tes écarts a cassé une contrainte de la semaine ────────────
  const modifiee = aTraiter.find((x) => x.ecart)
  if (modifiee && alertes && alertes.length > 0) {
    out.push({
      cle: 'contrainte-cassee', sujet: 'semaine',
      obligatoire: true,
      ton: 'vigilance',
      texte: `Attention à la semaine que tes changements ont formée : ${alertes[0].toLowerCase()} Rien ne t'en empêche, mais c'est une contrainte que ton tendon a posée, pas le plan.`,
    })
  }

  // ── 4. Tu as sauté la séance du jour ────────────────────────────────────
  const sautee = aTraiter.find((x) => x.saute && x.ecart === 'saut')
  if (sautee) {
    out.push({
      cle: 'seance-sautee', sujet: 'seance',
      ton: 'neutre',
      texte: `Tu as sauté ${avecArticle(sautee.typePlan)} d'aujourd'hui. Elle ne compte pas dans la charge et le plan ne la rattrape pas : la semaine prochaine reprend là où elle devait. Une séance sautée vaut mieux qu'une séance forcée, mais deux de suite sur la même famille commencent à se voir en avril.`,
    })
  }

  // ── 5. Tu as remplacé la séance par autre chose ─────────────────────────
  const remplacee = vivantes.find((x) => x.ecart === 'remplacement' && x.type !== x.typePlan)
  if (remplacee) {
    const versDoux = COURSE.includes(remplacee.typePlan) && PLUS_DOUX.includes(remplacee.type)
    const versDur = PLUS_DOUX.includes(remplacee.typePlan) && COURSE.includes(remplacee.type)

    if (versDoux) {
      out.push(
        bas
          ? {
              cle: 'remplacement', sujet: 'seance',
              ton: 'neutre',
              texte: `Tu as remplacé ta ${nomAvecKm(remplacee.typePlan, remplacee.distPlan)} par ${avecArticle(remplacee.type)}. L'${surIndice} ne te le demandait pas, donc c'est ton ressenti qui tranche, et c'est le bon ordre. Ces kilomètres-là sortent du volume de la semaine : si tu peux, remets-les ailleurs plutôt que de les perdre.`,
            }
          : {
              cle: 'remplacement', sujet: 'seance',
              ton: 'bravo',
              texte: `Bon réflexe : tu as remplacé ta ${nomCourt(remplacee.typePlan)} par ${avecArticle(remplacee.type)} avec un ${surIndice}. C'est exactement la décision que le plan aurait prise à ta place.`,
            },
      )
    } else if (versDur) {
      out.push({
        cle: 'remplacement', sujet: 'seance',
        ton: 'vigilance',
        texte: `Tu as mis ${avecArticle(remplacee.type)} là où le plan mettait ${avecArticle(remplacee.typePlan)}${remplacee.dist != null ? `, soit ${formatNumber(remplacee.dist)} km d'impact en plus` : ''}. L'${surIndice}${bas ? ', le tendon peut l’encaisser' : ' est déjà haut'}, mais le vélo n'est pas là par hasard : il porte du volume aérobie sans choc au sol, et c'est ce qui te permet de courir le reste.`,
      })
    } else {
      out.push({
        cle: 'remplacement', sujet: 'seance',
        ton: 'neutre',
        texte: `Tu as remplacé ta ${nomCourt(remplacee.typePlan)} du jour par ${avecArticle(remplacee.type)}. L'${surIndice}, la semaine tient ses contraintes.`,
      })
    }
  }

  // ── 6. Tu as déplacé une séance jusqu'ici ───────────────────────────────
  const deplacee = vivantes.find((x) => x.ecart === 'deplacement')
  if (deplacee) {
    out.push({
      cle: 'deplacement', sujet: 'seance',
      ton: 'neutre',
      texte: `Ta ${nomAvecKm(deplacee.type, deplacee.dist)} est arrivée sur aujourd'hui. Aucune contrainte de la semaine ne tombe, et l'${surIndice} : la journée est jouable telle que tu l'as posée.`,
    })
  }

  // ── 7. Tu as corrigé la distance ou la durée ────────────────────────────
  const corrigee = vivantes.find(
    (x) => x.ecart === 'donnee' && x.dist != null && x.distPlan != null && x.dist !== x.distPlan,
  )
  if (corrigee) {
    const plus = (corrigee.dist ?? 0) > (corrigee.distPlan ?? 0)
    out.push({
      cle: 'donnee-corrigee', sujet: 'seance',
      ton: plus ? 'vigilance' : 'neutre',
      texte: `Tu as noté ${formatNumber(corrigee.dist ?? 0)} km sur ta ${nomCourt(corrigee.type)} au lieu des ${formatNumber(corrigee.distPlan ?? 0)} km prévus. ${
        plus
          ? "C'est du volume que le plan n'avait pas budgété : il entre dans la charge, et la sortie longue de la semaine prochaine se décidera dessus."
          : "La charge suit ce que tu as vraiment fait, pas ce qui était écrit."
      }`,
    })
  }

  // ── 8. La charge n'est plus attestée ────────────────────────────────────
  if (indice.chargeInconnue) {
    out.push({
      cle: 'charge-inconnue', sujet: 'carnet',
      ton: 'vigilance',
      texte:
        "Trop de séances non notées cette semaine : la part mécanique de ton indice suppose plus qu'elle ne mesure, et elle se trompe toujours du côté rassurant. Note-les et je pourrai te dire quelque chose de ta séance du jour.",
    })
  }

  return out
}

/** La plus forte douleur saisie un jour donné, toutes mesures confondues. */
function douleurMax(pain: PainMap, jour: string): number | null {
  const p = pain[jour]
  const vs = [p?.wake, p?.evening, p?.effort].filter((v): v is number => v != null)
  return vs.length ? Math.max(...vs) : null
}

/** Ce que le coach peut dire du fond, hors séance du jour. */
function candidatsFond(entree: EntreeCoach): MotCoach[] {
  const { pain, byDate, now, seancesTotal, duJour, indice, jusquaCourse } = entree
  const out: MotCoach[] = []

  /** La séance du jour qui mérite qu'on l'encourage nommément. */
  const aVenir = (duJour ?? []).find(
    (x) => !x.faite && !x.saute && ['long', 'tempo', 'inter', 'test'].includes(x.type),
  )
  const relance = aVenir ? ` Tiens l'allure prévue sur ta ${nomCourt(aVenir.type)} d'aujourd'hui.` : ''

  const recent = reveils(pain, now, 14)
  const avant = reveils(pain, addDays(now, -14), 14)
  const excentrique = joursExcentrique(pain, now, 28)
  // Quatre saisies de chaque côté au minimum : en dessous, une seule mauvaise
  // nuit déplacerait la moyenne et on annoncerait une tendance qui n'existe pas.
  const assezDeReveils = recent.length >= 4 && avant.length >= 4

  // ── La raideur au réveil, le marqueur de référence ──────────────────────
  if (assezDeReveils) {
    const a = moyenne(avant)
    const b = moyenne(recent)
    const ecart = a - b

    if (ecart >= 0.4) {
      const chiffres = `de ${formatNumber(a)} à ${formatNumber(b)} sur dix`
      out.push({
        cle: 'raideur-baisse', sujet: 'raideur',
        ton: 'bravo',
        texte:
          excentrique >= 8
            ? `Bien joué. Ton excentrique ${excentrique} jours sur les 28 derniers a payé : ta raideur au réveil est passée ${chiffres}.${relance}`
            : `Ça descend. Ta raideur au réveil est passée ${chiffres} en deux semaines. Continue exactement comme ça.${relance}`,
      })
    } else if (ecart <= -0.4) {
      out.push({
        cle: 'raideur-hausse', sujet: 'raideur',
        ton: 'vigilance',
        texte: `Ta raideur au réveil remonte, de ${formatNumber(a)} à ${formatNumber(b)} sur dix. Ce n'est pas encore une alerte, mais c'est le moment de ne rien forcer et de tenir l'excentrique.`,
      })
    } else if (excentrique >= 12) {
      out.push({
        cle: 'raideur-stable-observance', sujet: 'raideur',
        ton: 'bravo',
        texte: `Raideur au réveil stable à ${formatNumber(b)} sur dix, avec l'excentrique fait ${excentrique} jours sur 28. C'est exactement ce qu'on cherche : de la charge encaissée sans que le tendon proteste.${relance}`,
      })
    }
  }

  // ── L'observance du protocole ───────────────────────────────────────────
  if (excentrique >= 8) {
    out.push({
      cle: 'excentrique', sujet: 'excentrique',
      ton: 'bravo',
      texte: `Excentrique fait ${excentrique} jours sur les 28 derniers. C'est le seul geste qui répare vraiment le tendon, et c'est celui que tu tiens le mieux.`,
    })
  }

  // ── La régularité de la semaine ─────────────────────────────────────────
  if (seancesTotal.prevu >= 4 && seancesTotal.realise >= seancesTotal.prevu) {
    out.push({
      cle: 'semaine-complete', sujet: 'regularite',
      ton: 'bravo',
      texte: `Semaine complète : ${seancesTotal.realise} séances sur ${seancesTotal.prevu}. La régularité vaut mieux qu'une grosse sortie isolée, surtout sur un tendon en convalescence.`,
    })
  }

  // ── Le compteur qui ouvre le volume ─────────────────────────────────────
  // Le « depuis » s'arrête au premier jour du carnet dans la fenêtre : sans
  // ça, un carnet de vingt jours sans douleur s'annoncerait comme soixante.
  let derniereForte: number | null = null
  let premierReleve: number | null = null
  for (let k = 0; k < 60; k++) {
    const m = douleurMax(pain, addDays(now, -k))
    if (m == null) continue
    premierReleve = k
    if (m > 2) {
      derniereForte = k
      break
    }
  }
  const sansDouleur = derniereForte ?? (premierReleve != null ? premierReleve + 1 : 0)
  let releves = 0
  for (let k = 0; k < sansDouleur; k++) if (douleurMax(pain, addDays(now, -k)) != null) releves++
  // Trois relevés sur quatre, la même exigence que `verdictVolume` : un
  // carnet troué affiche zéro douleur, et ce compteur-là ouvre du volume.
  if (sansDouleur >= 7 && releves >= 0.75 * sansDouleur) {
    out.push({
      cle: 'sans-douleur', sujet: 'douleur',
      ton: 'bravo',
      texte: `Aucune douleur au-dessus de 2 sur dix depuis ${sansDouleur} jours, sur ${releves} relevés. C'est ce compteur qui rend le volume : à 28 jours un vélo devient la séance spécifique, à 56 le second devient une course.`,
    })
  }

  out.push(...candidatsRecul(entree))

  // ── L'indice ────────────────────────────────────────────────────────────
  const idxRecent = indiceMoyen(byDate, now, 7)
  const idxAvant = indiceMoyen(byDate, addDays(now, -7), 7)
  if (idxRecent != null && idxAvant != null && idxAvant - idxRecent >= 3) {
    out.push({
      cle: 'indice-baisse', sujet: 'charge',
      ton: 'bravo',
      texte: `Ton indice de charge moyen est passé de ${Math.round(idxAvant)} à ${Math.round(idxRecent)} en une semaine. Le tendon récupère plus vite qu'il ne se charge.${relance}`,
    })
  }

  // ── La charge de la semaine écoulée ─────────────────────────────────────
  // Hier et avant seulement : aujourd'hui porte la séance projetée, pas faite.
  // Et jamais sur une charge non attestée, qui se lit toujours trop légère.
  if (indice && !indice.chargeInconnue) {
    const somme = (debut: number) => {
      let s = 0
      let jours = 0
      for (let k = debut; k < debut + 7; k++) {
        const r = byDate[addDays(now, -k)]
        if (r?.load != null) {
          s += r.load
          jours++
        }
      }
      return jours === 7 ? s : null
    }
    const cette = somme(1)
    const precedente = somme(8)
    if (cette != null && precedente != null && precedente > 0) {
      const variation = Math.round(((cette - precedente) / precedente) * 100)
      if (Math.abs(variation) >= 15) {
        out.push({
          cle: 'charge-semaine', sujet: 'charge',
          ton: 'neutre',
          texte:
            variation > 0
              ? `Ta charge tendineuse des sept derniers jours est ${variation} % au-dessus de la semaine d'avant. Rien d'alarmant tant que la raideur au réveil ne suit pas : c'est elle qu'il faut regarder demain matin.`
              : `Ta charge tendineuse des sept derniers jours est ${-variation} % sous celle de la semaine d'avant. C'est de la marge rendue au tendon.`,
        })
      }
    }
  }

  // ── La tenue du carnet ──────────────────────────────────────────────────
  // Le matin même peut ne pas être saisi encore : la série part d'hier dans ce cas.
  let serie = 0
  for (let k = pain[now]?.wake != null ? 0 : 1; k < 60; k++) {
    if (pain[addDays(now, -k)]?.wake == null) break
    serie++
  }
  if (serie >= 5) {
    out.push({
      cle: 'carnet-tenu', sujet: 'carnet',
      ton: 'bravo',
      texte: `${serie} matins de suite notés. C'est ce qui garde l'indice honnête : trois matins sans saisie et il cesse de savoir.`,
    })
  }

  // ── La raideur stable : une observation plate, elle passe après tout ────
  if (assezDeReveils) {
    out.push({
      cle: 'raideur-stable', sujet: 'raideur',
      ton: 'neutre',
      texte: `Raideur au réveil stable autour de ${formatNumber(moyenne(recent))} sur dix depuis un mois. Le tendon encaisse ce que tu lui donnes.`,
    })
  } else {
    out.push({
      cle: 'noter-reveil', sujet: 'carnet',
      ton: 'neutre',
      texte:
        'Note ta douleur au réveil chaque matin : c’est à partir de quatre semaines de saisies que le coach peut te dire si ça progresse vraiment.',
    })
  }

  // ── Toujours vrai, toujours disponible : c'est lui qui garantit qu'il y a
  // un autre mot que celui d'hier ─────────────────────────────────────────
  if (jusquaCourse != null && jusquaCourse > 0) {
    out.push({
      cle: 'compte-a-rebours', sujet: 'echeance',
      ton: 'neutre',
      texte: `J-${jusquaCourse} avant Paris. Ce qui déplace le chrono d'avril, ce n'est pas une grosse séance réussie, c'est d'enchaîner les blocs sans interruption.`,
    })
  }

  return out
}

/**
 * Ce qui demande de lever le pied, hors séance du jour : un épisode de douleur
 * qui démarre, une décharge qui ne décharge pas, une semaine qui s'écarte du
 * plan. Ça passe avant les encouragements, et jamais sur une charge non
 * attestée, qui se lit toujours trop légère.
 */
function candidatsVigilance({ pain, now, duJour, indice, semaine }: EntreeCoach): MotCoach[] {
  const out: MotCoach[] = []

  // ── Un nouvel épisode de douleur ────────────────────────────────────────
  // Le fond se mesure sur les quatre semaines d'avant, hors les trois derniers
  // jours : un épisode ne doit pas relever sa propre référence.
  const fond: number[] = []
  for (let k = 3; k < 31; k++) {
    const m = douleurMax(pain, addDays(now, -k))
    if (m != null) fond.push(m)
  }
  const recents = [douleurMax(pain, now), douleurMax(pain, addDays(now, -1))].filter(
    (v): v is number => v != null,
  )
  if (fond.length >= 10 && recents.length > 0) {
    const habituel = moyenne(fond)
    const pic = Math.max(...recents)
    if (pic >= 3 && pic - habituel >= 2) {
      const aFaire = (duJour ?? []).filter((x) => !x.faite && !x.saute)
      const course = aFaire.find((x) => COURSE.includes(x.type))
      const velo = aFaire.find((x) => x.type === 'velo')
      const conseil = course
        ? ` C'est ta ${nomCourt(course.type)} d'aujourd'hui qu'il faut alléger en premier : raccourcis-la, ou passe-la au vélo en Z2.`
        : velo
          ? " Même le vélo d'aujourd'hui compte : reste en Z2. Les deux pics du soir de ton carnet suivaient tous les deux du home trainer en Z3."
          : ''
      out.push({
        cle: 'episode-douleur', sujet: 'douleur',
        ton: 'vigilance',
        texte: `Nouvel épisode de douleur : ${formatNumber(pic)} sur dix, contre ${formatNumber(habituel)} en moyenne ces quatre dernières semaines.${conseil} Le verdict se lit demain matin, sur la raideur au réveil.`,
      })
    }
  }

  // ── La semaine face au plan ─────────────────────────────────────────────
  if (semaine && indice && !indice.chargeInconnue && semaine.joursEcoules >= 2) {
    if (semaine.decharge && semaine.referenceCharge) {
      // `check_plan.py` exige −20 % : c'est la même barre, lue sur le réel.
      const part = Math.round(((semaine.realisee + semaine.reste) / semaine.referenceCharge) * 100)
      if (part > 80) {
        out.push({
          cle: 'decharge-trop-chargee', sujet: 'semaine',
          ton: 'vigilance',
          texte: `Semaine de décharge, mais elle file vers ${part} % de la charge de ta dernière semaine de charge. Une décharge descend sous 80 %, sinon le tendon n'en tire rien : on coupe la sortie longue et le vélo, pas la qualité.`,
        })
      }
    } else if (!semaine.decharge && semaine.prevue > 0) {
      const ecart = Math.round((semaine.realisee / semaine.prevue - 1) * 100)
      if (ecart >= 20) {
        out.push({
          cle: 'semaine-hors-attentes', sujet: 'semaine',
          ton: 'vigilance',
          texte: `Depuis lundi, tu as encaissé ${ecart} % de charge de plus que le plan n'en prévoyait sur les mêmes jours. Ce surplus n'était pas budgété : garde la fin de semaine telle qu'écrite, sans rien ajouter.`,
        })
      } else if (ecart <= -20) {
        out.push({
          cle: 'semaine-hors-attentes', sujet: 'semaine',
          ton: 'neutre',
          texte: `Depuis lundi, ta charge est ${-ecart} % sous ce que le plan prévoyait sur les mêmes jours. Ne la rattrape pas d'un bloc en fin de semaine : c'est l'accumulation soudaine qui blesse, pas le manque.`,
        })
      }
    }
  }

  return out
}

/**
 * La séance d'hier, jugée sur ce qu'on en attendait. L'effort perçu dit si
 * l'allure était la bonne, la durée réelle dit si elle a été tenue. Les deux ne
 * se lisent que sur la course : le vélo et le renfo n'ont pas d'effort attendu.
 */
function candidatsHier({ hier }: EntreeCoach): MotCoach[] {
  const s = hier?.find((x) => x.rpe != null && x.rpeAttendu != null)
  if (!s) return []
  const rpe = s.rpe!
  const attendu = s.rpeAttendu!
  const nom = nomCourt(s.type)

  let duree = ''
  if (s.dureeReelle != null && s.dureeEstimee) {
    const [a, b] = s.dureeEstimee
    // Dix pour cent de marge : la fourchette est déjà une estimation.
    if (s.dureeReelle > b * 1.1) {
      duree = ` Et ${formatDuration(s.dureeReelle)} au lieu de ${formatDuration(a)} à ${formatDuration(b)} : plus lente que le plan.`
    } else if (s.dureeReelle < a * 0.9) {
      duree = ` Et ${formatDuration(s.dureeReelle)}, sous les ${formatDuration(a)} prévues : plus rapide que le plan.`
    } else {
      duree = ` Et ${formatDuration(s.dureeReelle)}, dans la fourchette prévue.`
    }
  }
  const douleur =
    s.douleur != null && s.douleur >= 4
      ? ` Avec ${formatNumber(s.douleur)} de douleur pendant l'effort : c'est ta raideur de ce matin qui dira si elle est passée.`
      : ''
  const ecart = rpe - attendu

  if (ecart >= 2) {
    return [{
      cle: 'seance-hier', sujet: 'seance',
      ton: 'vigilance',
      texte: `Ta ${nom} d'hier t'a coûté ${rpe} sur dix d'effort perçu, pour ${attendu} attendu.${duree}${douleur} Deux points de trop, c'est une allure trop haute ou de la fatigue qui s'accumule : lève le pied sur la prochaine.`,
    }]
  }
  if (ecart <= -2) {
    return [{
      cle: 'seance-hier', sujet: 'seance',
      ton: douleur ? 'vigilance' : 'bravo',
      texte: `Ta ${nom} d'hier est passée facilement : ${rpe} sur dix d'effort perçu, pour ${attendu} attendu.${duree}${douleur} Si ça se répète, c'est ta forme projetée qui monte.`,
    }]
  }
  return [{
    cle: 'seance-hier', sujet: 'seance',
    ton: douleur ? 'vigilance' : 'bravo',
    texte: `Ta ${nom} d'hier est exécutée comme prévu : ${rpe} sur dix d'effort perçu, pour ${attendu} attendu.${duree}${douleur}`,
  }]
}

/**
 * Ce qui ne se voit qu'avec du recul : le jour de la semaine qui fait mal, la
 * douleur et la forme sur plusieurs mois, et l'excentrique à tenir.
 */
function candidatsRecul({ pain, now, forme }: EntreeCoach): MotCoach[] {
  const out: MotCoach[] = []

  // ── L'excentrique, poussé plutôt que seulement salué ────────────────────
  let serie = 0
  for (let k = pain[now]?.eccentric ? 0 : 1; k < 60; k++) {
    if (!pain[addDays(now, -k)]?.eccentric) break
    serie++
  }
  const hier = pain[addDays(now, -1)]
  if (serie >= 3) {
    out.push({
      cle: 'excentrique-serie', sujet: 'excentrique',
      ton: 'bravo',
      texte: `${serie} jours d'excentrique d'affilée. Chaque séance retire 6 points à ton indice du lendemain : c'est le seul chiffre de l'app que tu décides entièrement.`,
    })
  } else if (hier && !hier.eccentric && !pain[now]?.eccentric) {
    // Seulement sur un carnet tenu hier : sinon l'absence de coche ne dit rien.
    const sur7 = joursExcentrique(pain, addDays(now, -1), 7)
    out.push({
      cle: 'excentrique-relance', sujet: 'excentrique',
      ton: 'neutre',
      texte: `Pas d'excentrique noté hier${sur7 > 0 ? `, ${sur7} jour${sur7 > 1 ? 's' : ''} sur les sept derniers` : ''}. Ton Stanish ce soir, et ton indice de demain perd 6 points. C'est le traitement, pas un bonus.`,
    })
  }

  // ── Le jour de la semaine qui revient en tête des douleurs ──────────────
  const parJour: number[][] = Array.from({ length: 7 }, () => [])
  for (let k = 1; k <= 42; k++) {
    const d = addDays(now, -k)
    const vs = [pain[d]?.evening, pain[d]?.effort].filter((v): v is number => v != null)
    if (vs.length) parJour[weekdayIndex(d)].push(Math.max(...vs))
  }
  // Trois relevés par jour au moins, sur cinq jours de la semaine : sinon une
  // seule mauvaise soirée fabrique un « jour qui fait mal ».
  const moyennes = parJour.map((vs) => (vs.length >= 3 ? moyenne(vs) : null))
  if (moyennes.filter((m) => m != null).length >= 5) {
    let pire = -1
    moyennes.forEach((m, i) => {
      if (m != null && (pire < 0 || m > moyennes[pire]!)) pire = i
    })
    const autres = parJour.filter((_, i) => i !== pire).flat()
    const m = moyennes[pire]!
    if (autres.length > 0 && m >= 2.5 && m - moyenne(autres) >= 1) {
      out.push({
        cle: 'jour-douloureux', sujet: 'douleur',
        ton: 'vigilance',
        texte: `Le ${DAYS_LONG[pire].toLowerCase()} revient en tête de tes douleurs depuis six semaines : ${formatNumber(m)} sur dix en moyenne, contre ${formatNumber(moyenne(autres))} les autres jours. Regarde ce que porte cette journée et la veille dans le programme : c'est la séance à alléger en premier.`,
      })
    }
  }

  // ── La douleur sur le long terme ────────────────────────────────────────
  // Les trois premières semaines du carnet contre les deux dernières : c'est
  // la seule comparaison qui dit si la convalescence avance.
  let premier: string | null = null
  for (let k = 180; k >= 0; k--) {
    const d = addDays(now, -k)
    if (pain[d]?.wake != null) {
      premier = d
      break
    }
  }
  if (premier && daysBetween(premier, now) >= 42) {
    const debut: number[] = []
    for (let k = 0; k < 21; k++) {
      const v = pain[addDays(premier, k)]?.wake
      if (v != null) debut.push(v)
    }
    const fin = reveils(pain, now, 14)
    if (debut.length >= 8 && fin.length >= 8) {
      const a = moyenne(debut)
      const b = moyenne(fin)
      if (a - b >= 0.3) {
        out.push({
          cle: 'douleur-long-terme', sujet: 'raideur',
          ton: 'bravo',
          texte: `Depuis le ${formatDay(premier)}, ta raideur au réveil est passée de ${formatNumber(a)} sur dix sur tes trois premières semaines de carnet à ${formatNumber(b)} ces deux dernières. C'est cette courbe qui compte, bien plus qu'un mauvais matin.`,
        })
      } else if (b - a >= 0.3) {
        out.push({
          cle: 'douleur-long-terme', sujet: 'raideur',
          ton: 'vigilance',
          texte: `Depuis le ${formatDay(premier)}, ta raideur au réveil est remontée de ${formatNumber(a)} sur dix à ${formatNumber(b)}. Rien d'alarmant un jour donné, mais c'est une tendance de fond : à montrer à ton kiné.`,
        })
      }
    }
  }

  // ── Le niveau en course à pied ──────────────────────────────────────────
  if (forme && forme.seances >= 3 && Math.abs(forme.ecart) >= 3) {
    const ecart = Math.round(Math.abs(forme.ecart))
    const chrono = formatDuration(Math.round((forme.allure * 42.195) / 60))
    out.push(
      forme.ecart < 0
        ? {
            cle: 'forme-long-terme', sujet: 'forme',
            ton: 'bravo',
            texte: `Ton effort perçu des quatre dernières semaines te met ${ecart} s/km plus vite que ton dernier test ne le disait : forme projetée à ${formatPace(forme.allure)}/km, soit ${chrono} au marathon. Le prochain test dira si c'est acquis.`,
          }
        : {
            cle: 'forme-long-terme', sujet: 'forme',
            ton: 'neutre',
            texte: `Ton effort perçu des quatre dernières semaines te met ${ecart} s/km plus lent que ton dernier test : forme projetée à ${formatPace(forme.allure)}/km, soit ${chrono} au marathon. Plus souvent de la fatigue qu'une perte de forme, c'est le prochain test qui tranchera.`,
          },
    )
  }

  return out
}

/**
 * Le mot du jour.
 *
 * **Jamais le même mot deux jours de suite.** Un message qui revient chaque
 * matin cesse d'être lu au troisième, et emporte avec lui celui qui aurait
 * compté. `exclure` porte la règle affichée la veille : on prend la première
 * autre. La comparaison se fait sur la RÈGLE et pas sur le texte, sinon
 * « de 1,2 à 0,7 » puis « de 1,2 à 0,6 » passeraient pour deux messages.
 *
 * Seule exception, ce que l'indice impose ou ce qu'une contrainte cassée
 * signale : ça se répète tant que c'est vrai. Taire le deuxième jour d'une
 * course retirée serait le laisser croire levé.
 */
export function motDuCoach(entree: EntreeCoach): MotCoach {
  const candidats = [
    ...candidatsSeance(entree),
    ...candidatsVigilance(entree),
    ...candidatsHier(entree),
    ...candidatsFond(entree),
  ]
  const exclus = new Set(entree.exclureSujets ?? [])
  return (
    candidats.find((c) => c.obligatoire) ??
    candidats.find((c) => !exclus.has(c.sujet)) ??
    // Tout a déjà été dit ces derniers jours : mieux vaut répéter le sujet le
    // plus ancien que se taire, mais on prend le dernier de la liste, qui est
    // le moins prioritaire et donc le moins susceptible d'avoir servi hier.
    candidats[candidats.length - 1]
  )
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
