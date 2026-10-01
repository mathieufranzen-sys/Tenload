/**
 * La batterie de scénarios du calcul de la charge.
 *
 * Demandée par Mathieu le 1er octobre 2026, avant d'appliquer les valeurs
 * tirées des nouvelles sources : pour chaque cobaye du laboratoire, une
 * hypothèse sur ce que le calcul devrait faire, une attente chiffrée, et un
 * résultat mesuré par le VRAI moteur (`moteur.ts`, la chaîne de l'app).
 *
 * Le coureur simulé fait ce que l'app lui prescrit, jour après jour : le
 * matin on note la raideur, on lit les séances du jour telles que le moteur
 * les adapte, on les fait et on les note, le soir on note la douleur. Un
 * scénario qui suivrait le plan de référence mesurerait un coureur qui
 * n'écoute pas l'app.
 *
 * Les résultats se figent dans `batterie-resultats.json` par
 * `batterie-cli.ts` : une colonne par version du calcul, pour comparer.
 */
import planJson from '../data/plan.json'
import notionSeed from '../data/notion-seed.json'
import stravaSeed from '../data/strava-seed.json'
import type { Plan, Session, SessionType } from '../data/types'
import { buildPain, type DailyLogRow } from '../lib/buildPain'
import { activityLoad, sessionLoad, type ActivityRow } from '../lib/load'
import { TYPES_COURUS } from '../lib/overrides'
import { seancesDeLaSemaine } from '../lib/adapt'
import { REPRISE, etatReprise, type NiveauEpisode } from '../lib/reprise'
import { bandOf, indexSeries, tendonIndex, type IndexBreakdown, type LoadMap, type PainMap } from '../lib/tendonIndex'
import { addDays } from '../lib/dates'
import { ANCRE, construireProfil, type CleProfil, type JeuLabo } from './scenarios'
import { calculer, entrees } from './moteur'

const plan = planJson as unknown as Plan

// ─────────────────────────────────────────────────────────── simulation

interface Jour {
  reveil?: number | null
  soir?: number | null
  /** Douleur pendant les séances du jour. */
  effort?: number | null
  excentrique?: boolean
  sauts?: boolean
  /** Rien de saisi ce jour-là, ni carnet ni séance. */
  silence?: boolean
  /** Ce que le coureur fait de la séance prescrite. Absent : il la fait telle quelle. */
  seance?: (type: SessionType, dist: number | undefined) => { type?: SessionType; dist?: number } | null
}

interface Prescription {
  day: string
  type: SessionType
  typePlan: SessionType
  motif?: string
}

const clone = (jeu: JeuLabo): JeuLabo => ({
  logs: jeu.logs.map((l) => ({ ...l })),
  feedback: jeu.feedback.map((f) => ({ ...f })),
  activities: jeu.activities,
  ecarts: jeu.ecarts,
})

const semaineDe = (d: string) => plan.weeks.find((w) => w.monday <= d && d <= addDays(w.monday, 6))

/** Les séances du jour telles que l'app les prescrit le matin, raideur du jour saisie. */
function prescrites(jeu: JeuLabo, d: string) {
  const w = semaineDe(d)
  if (!w) return []
  const { ecarts, contexte } = entrees(jeu, d)
  const { byDate } = calculer(jeu, d)
  return seancesDeLaSemaine(plan.weeks, w, d, byDate, ecarts, contexte).filter(
    (x) => x.day === d && x.s.type !== 'repos',
  )
}

/**
 * Avance le jeu de `jours` jours à partir de `debut`, en faisant ce que l'app
 * prescrit. Rend le jeu complété et le journal des prescriptions.
 */
function avancer(base: JeuLabo, debut: string, jours: number, f: (k: number, d: string) => Jour) {
  const jeu = clone(base)
  const journal: Prescription[] = []
  for (let k = 0; k < jours; k++) {
    const d = addDays(debut, k)
    const j = f(k, d)
    jeu.logs = jeu.logs.filter((l) => l.day !== d)
    jeu.feedback = jeu.feedback.filter((x) => x.day !== d)
    if (j.silence) continue

    const log: DailyLogRow = {
      day: d,
      pain_wake: j.reveil ?? null,
      pain_effort: null,
      pain_evening: null,
      eccentric: j.excentrique ?? true,
      icing: false,
      jumps: j.sauts ?? false,
      hydration_l: 2,
    }
    jeu.logs.push(log)

    for (const x of prescrites(jeu, d)) {
      journal.push({ day: d, type: x.s.type, typePlan: x.typePlan, motif: x.s.motif })
      const choix = j.seance?.(x.s.type, x.s.dist) ?? {}
      if (choix === null) continue
      const type = choix.type ?? x.s.type
      const dist = choix.dist ?? x.s.dist
      jeu.feedback.push({
        week: x.semaineOrigine,
        day_index: x.jourOrigine,
        slot: x.slot,
        day: d,
        session_type: type,
        pain: j.effort ?? 0,
        rpe: 4,
        distance_km: dist ?? (type === 'velo' ? 20 : null),
        note: null,
      })
    }
    log.pain_evening = j.soir ?? null
  }
  return { jeu, journal }
}

// ─────────────────────────────────────────────────────────── mesures

type Serie = Array<IndexBreakdown & { day: string; load: number }>

/** L'indice de chaque jour, lu en fin de journée au jour `fin`. */
export function serie(jeu: JeuLabo, debut: string, fin: string): Serie {
  const { byDate } = calculer(jeu, fin)
  const out: Serie = []
  for (let d = debut; d <= fin; d = addDays(d, 1)) if (byDate[d]) out.push(byDate[d])
  return out
}

const maxIdx = (s: Serie) => Math.max(...s.map((r) => r.idx))
const yoyo = (s: Serie) => Math.max(0, ...s.slice(1).map((r, i) => Math.abs(r.idx - s[i].idx)))
const partMeca = (r: IndexBreakdown) => {
  const meca = r.ratio + r.freshness + r.monotony
  const tout = meca + r.pain + r.trend
  return tout > 0 ? meca / tout : 0
}
const nomBande = (idx: number) => bandOf(idx).name
/**
 * Les séances que le moteur a changées sur la période. L'ouverture du volume
 * n'en est pas une : c'est le plan qui s'élargit, pas le tendon qui proteste.
 */
const adaptees = (journal: Prescription[], debut: string, fin: string) =>
  journal.filter((p) => p.day >= debut && p.day <= fin && p.motif && p.motif !== 'faite' && p.motif !== 'volume').length

const arrondi = (v: number) => Math.round(v * 2) / 2
const DOULEUR_MAX = (p?: PainMap[string]) => Math.max(p?.wake ?? 0, p?.evening ?? 0, p?.effort ?? 0)

/** La douleur qui retombe à zéro en `duree` jours, depuis l'état du cobaye à l'ancre. */
function decroissance(base: JeuLabo, duree: number) {
  const w0 = base.logs.find((l) => l.day === ANCRE)?.pain_wake ?? 0
  const s0 = base.logs.find((l) => l.day === addDays(ANCRE, -1))?.pain_evening ?? 0
  return (k: number): Jour => {
    const f = Math.max(0, 1 - k / duree)
    const soir = arrondi(s0 * f)
    return { reveil: arrondi(w0 * f), soir, effort: Math.max(0, arrondi(soir - 0.5)) }
  }
}

const calme: Jour = { reveil: 0, soir: 0, effort: 0 }

/** Le cobaye passé sans douleur : retombée en deux semaines, puis trois semaines à zéro. */
const SANS_DOULEUR = 35
export function sansDouleur(cle: CleProfil, seance?: Jour['seance'], dernieres?: (k: number) => Partial<Jour>) {
  const base = construireProfil(cle)
  const desc = decroissance(base, 14)
  return avancer(base, ANCRE, SANS_DOULEUR, (k) => ({
    ...(k < 14 ? desc(k) : calme),
    seance,
    ...(dernieres?.(k) ?? {}),
  }))
}

export const FIN = addDays(ANCRE, SANS_DOULEUR - 1)
export const DERNIERE_SEMAINE = addDays(FIN, -6)

/** Jours entre le dernier relevé au-dessus de 2 et le premier jour vert qui tient. */
function retourAuVert(jeu: JeuLabo, fin: string): number | null {
  const { pain } = entrees(jeu, fin)
  let dernier: string | null = null
  for (let d = addDays(fin, -50); d <= fin; d = addDays(d, 1)) if (DOULEUR_MAX(pain[d]) > 2) dernier = d
  if (!dernier) return null
  const s = serie(jeu, dernier, fin)
  const i = s.findIndex((_, n) => s.slice(n).every((x) => x.idx < 30))
  return i < 0 ? null : i
}

const rang = (k: number | null) => (k == null ? 'aucun' : k === 0 ? '1er' : `${k + 1}e`)

/** Premier matin où la reprise rend la course, puis l'intensité (0 = le premier). */
function reprise(jeu: JeuLabo, debut: string, jours: number) {
  const { pain } = entrees(jeu, addDays(debut, jours))
  let course: number | null = null
  let intensite: number | null = null
  let requis: NiveauEpisode | '' = ''
  for (let k = 0; k < jours; k++) {
    const d = addDays(debut, k)
    const e = etatReprise(d, pain, d)
    if (k === 0 && e) requis = e.episode.niveau
    if (course == null && !e?.courseSuspendue) course = k
    if (intensite == null && !e?.intensiteSuspendue) intensite = k
  }
  // Le matin où chaque contrainte DOIT tomber d'après la règle : le n-ième
  // matin calme, c'est-à-dire l'indice n − 1 quand tous les matins le sont.
  const attendu = requis ? { course: Math.max(0, REPRISE[requis].course - 1), intensite: Math.max(0, REPRISE[requis].intensite - 1) } : { course: 0, intensite: 0 }
  return { course, intensite, requis, attendu }
}

// ─────────────────────────────────────────────────────────── données réelles

function reel() {
  const activities: ActivityRow[] = (stravaSeed as Array<{ date: string; sport: string; name: string; km: number; min: number }>).map(
    (a) => ({
      day: a.date,
      sport: a.sport === 'Soccer' ? 'Climb' : a.sport,
      name: a.name,
      distance_m: a.km * 1000,
      moving_s: a.min * 60,
    }),
  )
  const logs: DailyLogRow[] = (
    notionSeed as Array<{
      date: string
      painWake: number | null
      painEffort: number | null
      painEvening: number | null
      icing: boolean
      jumps: boolean
      hydration: number | null
      activities: string[]
    }>
  ).map((r) => ({
    day: r.date,
    pain_wake: r.painWake,
    pain_effort: r.painEffort,
    pain_evening: r.painEvening,
    icing: r.icing,
    jumps: r.jumps,
    eccentric: (r.activities ?? []).some((a) => /renfo bas/i.test(a)),
    hydration_l: r.hydration,
  }))
  const load: LoadMap = {}
  for (const a of activities) load[a.day] = (load[a.day] ?? 0) + activityLoad(a)
  const pain = buildPain({ logs })
  const debut = logs.map((l) => l.day).sort()[0]
  return { serie: indexSeries(debut, '2026-08-09', load, pain), pain }
}

// ─────────────────────────────────────────────────────────── scénarios

export interface Resultat {
  valeur: string
  ok: boolean
}

export interface Scenario {
  code: string
  cobaye: string
  titre: string
  hypothese: string
  attente: string
  mesurer: () => Resultat
}

const COBAYES: Record<string, string> = {
  'crise-debut': 'Cobaye 1 · Crise aiguë',
  'crise-fin': 'Cobaye 2 · Fin de crise',
  stable: 'Cobaye 3 · Stable',
  'crise-longue': 'Cobaye 4 · Rechute sur convalescence longue',
  reel: 'Tes données de l’été',
}

const courue = (t: SessionType) => TYPES_COURUS.includes(t)
const fois = (k: number) => (t: SessionType, dist?: number) => (courue(t) && dist ? { dist: Math.round(dist * k * 10) / 10 } : {})

export const SCENARIOS: Scenario[] = [
  // ── Cobaye 1
  {
    code: '1.1',
    cobaye: COBAYES['crise-debut'],
    titre: 'État au 27 septembre',
    hypothese: 'En crise, c’est la douleur qui décide, pas la charge.',
    attente: 'Rouge ou noir, part de la charge sous 20 %.',
    mesurer: () => {
      const r = calculer(construireProfil('crise-debut'), ANCRE).detail
      const part = partMeca(r)
      return { valeur: `${r.idx}, ${nomBande(r.idx)}, charge ${Math.round(part * 100)} %`, ok: r.idx >= 65 && part < 0.2 }
    },
  },
  {
    code: '1.2',
    cobaye: COBAYES['crise-debut'],
    titre: 'Réveils à 1 dès le lendemain',
    hypothese: 'Le plancher relâche, la reprise prend le relais.',
    attente: 'Après un noir : course au 3e matin calme, intensité au 14e.',
    mesurer: () => {
      const { jeu } = avancer(construireProfil('crise-debut'), addDays(ANCRE, 1), 20, () => ({ reveil: 1, soir: 1, effort: 1 }))
      const r = reprise(jeu, addDays(ANCRE, 1), 20)
      return {
        valeur: `${r.requis} : course au ${rang(r.course)} matin calme, intensité au ${rang(r.intensite)}`,
        ok: r.requis === 'noir' && r.course === r.attendu.course && r.intensite === r.attendu.intensite,
      }
    },
  },
  {
    code: '1.3',
    cobaye: COBAYES['crise-debut'],
    titre: 'Réveil à 4 au 3e jour de reprise',
    hypothese: 'Une rechute remet le compteur à zéro.',
    attente: 'Orange au moins le jour même, compteur à 0.',
    mesurer: () => {
      const debut = addDays(ANCRE, 1)
      const { jeu } = avancer(construireProfil('crise-debut'), debut, 3, (k) =>
        k < 2 ? { reveil: 1, soir: 1, effort: 1 } : { reveil: 4, soir: 2, effort: 2 },
      )
      const j3 = addDays(debut, 2)
      const idx = calculer(jeu, j3).detail.idx
      const e = etatReprise(j3, entrees(jeu, j3).pain, j3)
      return { valeur: `${idx}, ${nomBande(idx)}, compteur ${e?.calmes ?? '–'}`, ok: idx >= 50 && e?.calmes === 0 }
    },
  },
  {
    code: '1.4',
    cobaye: COBAYES['crise-debut'],
    titre: 'Plus rien saisi pendant 4 jours',
    hypothese: 'Un silence ne rassure pas.',
    attente: '« Je ne sais pas » au 4e jour, aucune course rendue.',
    mesurer: () => {
      const { jeu } = avancer(construireProfil('crise-debut'), addDays(ANCRE, 1), 4, () => ({ silence: true }))
      const j4 = addDays(ANCRE, 4)
      const r = calculer(jeu, j4).detail
      const e = etatReprise(j4, entrees(jeu, j4).pain, j4)
      return {
        valeur: `${r.painInconnue ? 'Je ne sais pas' : `indice ${r.idx}`}, course ${e?.courseSuspendue ? 'suspendue' : 'rendue'}`,
        ok: r.painInconnue && Boolean(e?.courseSuspendue),
      }
    },
  },

  // ── Cobaye 2
  {
    code: '2.1',
    cobaye: COBAYES['crise-fin'],
    titre: 'Douleur à 0 en deux semaines, plan suivi',
    hypothese: 'Sans douleur, l’indice redevient vert et le reste.',
    attente: 'Vert en 7 jours au plus après le dernier relevé au-dessus de 2, puis maximum 20.',
    mesurer: () => {
      const { jeu } = sansDouleur('crise-fin')
      const r = retourAuVert(jeu, FIN)
      const m = maxIdx(serie(jeu, addDays(ANCRE, 14), FIN))
      return { valeur: `vert en ${r ?? '–'} j, maximum ${m} ensuite`, ok: r != null && r <= 7 && m <= 20 }
    },
  },
  {
    code: '2.2',
    cobaye: COBAYES['crise-fin'],
    titre: 'Trois semaines plus tard, semaine type',
    hypothese: 'Une semaine saine ne fait pas de yoyo.',
    attente: 'Maximum 20, écart d’un jour à l’autre 10 au plus, aucune séance changée.',
    mesurer: () => {
      const { jeu, journal } = sansDouleur('crise-fin')
      const s = serie(jeu, DERNIERE_SEMAINE, FIN)
      const n = adaptees(journal, DERNIERE_SEMAINE, FIN)
      return { valeur: `max ${maxIdx(s)}, yoyo ${yoyo(s)}, ${n} séance(s) changée(s)`, ok: maxIdx(s) <= 20 && yoyo(s) <= 10 && n === 0 }
    },
  },
  {
    code: '2.3',
    cobaye: COBAYES['crise-fin'],
    titre: 'Deux semaines à 60 %, puis la remontée de l’app',
    hypothese: 'La remontée prévue n’est pas un emballement.',
    attente: 'Jamais au-dessus de 30 pendant les trois semaines de remontée.',
    mesurer: () => {
      const { jeu } = sansDouleur('crise-fin', undefined, (k) => (k >= 1 && k < 15 ? { seance: fois(0.6) } : {}))
      const s = serie(jeu, addDays(ANCRE, 15), FIN)
      return { valeur: `maximum ${maxIdx(s)}`, ok: maxIdx(s) <= 30 }
    },
  },
  {
    code: '2.4',
    cobaye: COBAYES['crise-fin'],
    titre: 'Une semaine à +40 % d’un coup',
    hypothese: 'Un vrai emballement reste visible.',
    attente: '30 au moins en fin de semaine, emballement au-dessus de 10 points.',
    mesurer: () => {
      const { jeu } = sansDouleur('crise-fin', undefined, (k) => (k >= SANS_DOULEUR - 7 ? { seance: fois(1.4) } : {}))
      const s = serie(jeu, DERNIERE_SEMAINE, FIN)
      const pic = s.reduce((a, b) => (b.idx > a.idx ? b : a))
      const emb = Math.max(...s.map((r) => r.ratio))
      return { valeur: `maximum ${pic.idx}, emballement ${emb}`, ok: pic.idx >= 30 && emb > 10 }
    },
  },

  {
    code: '2.5',
    cobaye: COBAYES['crise-fin'],
    titre: 'État au 27 septembre, raideur à 3,5 chaque matin',
    hypothese: 'Un tendon qui n’est pas revenu au calme se voit, même sans relevé à 4.',
    attente: 'Jaune par la douleur seule (charge sous 20 %), intensité en pause. La course suit encore la crise d’il y a trois semaines, jamais suivie de matins calmes.',
    mesurer: () => {
      const jeu = construireProfil('crise-fin')
      const r = calculer(jeu, ANCRE).detail
      const e = etatReprise(ANCRE, entrees(jeu, ANCRE).pain, ANCRE)
      const part = partMeca(r)
      return {
        valeur: `${r.idx}, ${nomBande(r.idx)}, charge ${Math.round(part * 100)} %, intensité ${e?.intensiteSuspendue ? 'en pause' : 'gardée'}, course ${e?.courseSuspendue ? 'en pause' : 'gardée'}`,
        ok: r.idx >= 30 && r.idx < 50 && part < 0.2 && Boolean(e?.intensiteSuspendue),
      }
    },
  },

  // ── Cobaye 3
  {
    code: '3.1',
    cobaye: COBAYES.stable,
    titre: 'Semaine type, douleur à 0',
    hypothese: 'Un tendon qui va bien : le cas visé.',
    attente: 'Maximum 10, écart d’un jour à l’autre 10 au plus, aucune séance changée.',
    mesurer: () => {
      const { jeu, journal } = sansDouleur('stable')
      const s = serie(jeu, DERNIERE_SEMAINE, FIN)
      const n = adaptees(journal, DERNIERE_SEMAINE, FIN)
      return { valeur: `max ${maxIdx(s)}, yoyo ${yoyo(s)}, ${n} séance(s) changée(s)`, ok: maxIdx(s) <= 10 && yoyo(s) <= 10 && n === 0 }
    },
  },
  {
    code: '3.2',
    cobaye: COBAYES.stable,
    titre: 'Fractionné du jeudi contre endurance de même distance',
    hypothese: 'L’intensité coûte un peu plus, pas le double (Firminger, Van Hooren).',
    attente: 'Le vendredi, 3 à 8 points de plus qu’après l’endurance.',
    mesurer: () => {
      const jeudi = '2026-10-22'
      const vendredi = '2026-10-23'
      const { jeu } = sansDouleur('stable')
      const ef = clone(jeu)
      for (const f of ef.feedback) if (f.day === jeudi && courue(f.session_type as SessionType)) f.session_type = 'ef'
      const a = calculer(jeu, vendredi).byDate[vendredi]
      const b = calculer(ef, vendredi).byDate[vendredi]
      const ecart = a.idx - b.idx
      return { valeur: `+${ecart} points (${a.idx} contre ${b.idx})`, ok: ecart >= 3 && ecart <= 8 }
    },
  },
  {
    code: '3.3',
    cobaye: COBAYES.stable,
    titre: 'Sortie longue de 26 km contre 18 km',
    hypothese: 'Le surcoût vient de la fin des longues.',
    attente: 'Le kilomètre de la longue de 26 coûte plus que celui de la longue de 18.',
    mesurer: () => {
      const lundi = '2026-10-19'
      const { jeu } = sansDouleur('stable')
      const avec = (km: number) => {
        const j = clone(jeu)
        for (const f of j.feedback) if (f.day === lundi && f.session_type === 'long') f.distance_km = km
        return calculer(j, lundi).byDate[lundi].load
      }
      const l26 = avec(26)
      const l18 = avec(18)
      const k26 = l26 / 26
      const k18 = l18 / 18
      return {
        valeur: `${k26.toFixed(2).replace('.', ',')} par km contre ${k18.toFixed(2).replace('.', ',')}`,
        ok: k26 > k18 + 0.01,
      }
    },
  },
  {
    code: '3.4',
    cobaye: COBAYES.stable,
    titre: 'Vélo de 60 min en Z2 contre Z3',
    hypothese: 'Le Z3 charge plus (Dick 2016, ton carnet).',
    attente: 'Le lendemain, le Z3 vaut au moins 3 points de plus.',
    mesurer: () => {
      const mercredi = '2026-10-21'
      const jeudi = '2026-10-22'
      const { jeu } = sansDouleur('stable')
      const { load, pain, attestes } = entrees(jeu, jeudi)
      const velo = (titre: string) => sessionLoad({ type: 'velo', title: titre, dur: [60, 60] } as Session)
      const base = (load[mercredi] ?? 0) - velo('Vélo Z2 60 min')
      const avec = (titre: string) => tendonIndex(jeudi, { ...load, [mercredi]: base + velo(titre) }, pain, undefined, attestes).idx
      const z2 = avec('Vélo Z2 60 min')
      const z3 = avec('Vélo Z3 60 min')
      return { valeur: `Z3 ${z3} contre Z2 ${z2}`, ok: z3 - z2 >= 3 }
    },
  },
  {
    code: '3.5',
    cobaye: COBAYES.stable,
    titre: 'Deux semaines à +30 %',
    hypothese: 'Le calcul voit venir le seuil de Nielsen.',
    attente: 'Jaune (30) avant la fin de la deuxième semaine.',
    mesurer: () => {
      const { jeu } = sansDouleur('stable', undefined, (k) => (k >= SANS_DOULEUR - 14 ? { seance: fois(1.3) } : {}))
      const s = serie(jeu, addDays(FIN, -13), FIN)
      return { valeur: `maximum ${maxIdx(s)}`, ok: maxIdx(s) >= 30 }
    },
  },
  {
    code: '3.6',
    cobaye: COBAYES.stable,
    titre: 'Sauts saisis tous les jours',
    hypothese: 'Les sauts ne protègent pas le tendon.',
    attente: 'L’indice ne baisse pas avec les sauts.',
    mesurer: () => {
      const { jeu } = sansDouleur('stable')
      const { load, pain, attestes } = entrees(jeu, FIN)
      const sauts: PainMap = {}
      for (const [d, p] of Object.entries(pain)) sauts[d] = { ...p, jumps: true }
      const sans = indexSeries(DERNIERE_SEMAINE, FIN, load, pain, attestes)
      const avec = indexSeries(DERNIERE_SEMAINE, FIN, load, sauts, attestes)
      const ecart = avec.reduce((a, r, i) => a + r.idx - sans[i].idx, 0) / avec.length
      return { valeur: `${ecart.toFixed(1).replace('.', ',')} point par jour`, ok: ecart >= 0 }
    },
  },
  {
    code: '3.7',
    cobaye: COBAYES.stable,
    titre: 'Douleur d’effort à 5 sur la longue, réveil suivant à 1',
    hypothese: 'Silbernagel tolère 5 si le lendemain matin est calme.',
    attente: 'Orange le jour même (plancher), vert ou jaune au surlendemain.',
    mesurer: () => {
      const lundi = '2026-10-19'
      const { jeu } = sansDouleur('stable', undefined, (k) =>
        addDays(ANCRE, k) === lundi ? { reveil: 0, soir: 2, effort: 5 } : {},
      )
      const s = serie(jeu, lundi, addDays(lundi, 3))
      const jeudi = addDays(lundi, 3)
      const e = etatReprise(jeudi, entrees(jeu, jeudi).pain, jeudi)
      return {
        valeur: `${s.map((r) => `${r.idx}`).join(' → ')}, qualité du jeudi ${e?.intensiteSuspendue ? 'en pause' : 'gardée'}`,
        ok: s[0].idx >= 50 && s[2].idx < 50,
      }
    },
  },

  {
    code: '3.8',
    cobaye: COBAYES.stable,
    titre: 'Réveils à 3 trois matins de suite, puis calmes',
    hypothese: 'Une douleur de fond qui s’installe retire l’intensité, pas la course (Silbernagel et Crossley).',
    attente: 'Jaune au 3e matin, intensité en pause, course gardée, qualité rendue au 3e matin calme.',
    mesurer: () => {
      const debut = addDays(ANCRE, 1)
      const { jeu } = avancer(construireProfil('stable'), debut, 9, (k) =>
        k < 3 ? { reveil: 3, soir: 1.5, effort: 1 } : { reveil: 1, soir: 1, effort: 1 },
      )
      const j3 = addDays(debut, 2)
      const idx = calculer(jeu, j3).detail.idx
      const { pain } = entrees(jeu, addDays(debut, 9))
      const e = etatReprise(j3, pain, j3)
      let rendue: number | null = null
      for (let k = 3; k < 9 && rendue == null; k++) {
        const d = addDays(debut, k)
        if (!etatReprise(d, pain, d)?.intensiteSuspendue) rendue = k - 2
      }
      return {
        valeur: `${idx}, ${nomBande(idx)}, intensité ${e?.intensiteSuspendue ? 'en pause' : 'gardée'}, course ${e?.courseSuspendue ? 'en pause' : 'gardée'}, qualité rendue au ${rendue ?? '–'}e matin calme`,
        ok: idx >= 30 && Boolean(e?.intensiteSuspendue) && !e?.courseSuspendue && rendue === 3,
      }
    },
  },

  // ── Cobaye 4
  {
    code: '4.1',
    cobaye: COBAYES['crise-longue'],
    titre: 'État au 27 septembre',
    hypothese: 'L’alerte vient de la douleur, la charge ne la masque pas.',
    attente: 'Orange.',
    mesurer: () => {
      const r = calculer(construireProfil('crise-longue'), ANCRE).detail
      return { valeur: `${r.idx}, ${nomBande(r.idx)}, charge ${Math.round(partMeca(r) * 100)} %`, ok: r.idx >= 50 && r.idx < 65 }
    },
  },
  {
    code: '4.2',
    cobaye: COBAYES['crise-longue'],
    titre: 'Matins calmes dès le lendemain',
    hypothese: 'La reprise suit le niveau de l’épisode, pas la charge.',
    attente: 'Les matins de la règle : crise 2 et 7, alerte 0 et 3.',
    mesurer: () => {
      const { jeu } = avancer(construireProfil('crise-longue'), addDays(ANCRE, 1), 10, () => ({ reveil: 1, soir: 1, effort: 1 }))
      const r = reprise(jeu, addDays(ANCRE, 1), 10)
      return {
        valeur: `${r.requis || 'aucun épisode'} : course au ${rang(r.course)} matin, intensité au ${rang(r.intensite)}`,
        ok: r.course === r.attendu.course && r.intensite === r.attendu.intensite,
      }
    },
  },
  {
    code: '4.3',
    cobaye: COBAYES['crise-longue'],
    titre: 'Réveils à 2,5 pendant trois semaines',
    hypothese: 'Une raideur de fond à 2,5 ne bloque pas pour toujours.',
    attente: 'Course gardée les deux dernières semaines.',
    mesurer: () => {
      const debut = addDays(ANCRE, 1)
      const { jeu } = avancer(construireProfil('crise-longue'), debut, 21, () => ({ reveil: 2.5, soir: 2, effort: 2 }))
      const { pain } = entrees(jeu, addDays(debut, 21))
      let bloques = 0
      for (let k = 7; k < 21; k++) {
        const d = addDays(debut, k)
        if (etatReprise(d, pain, d)?.courseSuspendue) bloques++
      }
      return { valeur: `${bloques} jour(s) sans course sur 14`, ok: bloques === 0 }
    },
  },
  {
    code: '4.4',
    cobaye: COBAYES['crise-longue'],
    titre: 'Plan suivi sans douleur après la rechute',
    hypothese: 'La charge seule ne relance pas d’alerte.',
    attente: 'Jamais orange sans relevé à 4 ou plus.',
    mesurer: () => {
      const { jeu } = sansDouleur('crise-longue')
      const s = serie(jeu, addDays(ANCRE, 14), FIN)
      const n = s.filter((r) => r.idx >= 50).length
      return { valeur: `${n} jour(s) orange, maximum ${maxIdx(s)}`, ok: n === 0 }
    },
  },

  // ── Données réelles
  {
    code: 'R.1',
    cobaye: COBAYES.reel,
    titre: '3 août, la veille de l’entorse',
    hypothese: 'Le modèle voyait une journée chargée.',
    attente: 'Jaune au moins (30), dans les 10 % les plus hauts de l’été.',
    mesurer: () => {
      const { serie: s } = reel()
      const jour = s.find((r) => r.day === '2026-08-03')!
      const tries = s.map((r) => r.idx).sort((a, b) => a - b)
      const rang = tries.filter((v) => v < jour.idx).length / tries.length
      return { valeur: `${jour.idx}, ${nomBande(jour.idx)}, au-dessus de ${Math.round(rang * 100)} % des jours`, ok: jour.idx >= 30 && rang >= 0.9 }
    },
  },
  {
    code: 'R.2',
    cobaye: COBAYES.reel,
    titre: 'L’été entier',
    hypothese: 'Le recalage ne doit pas tout aplatir.',
    attente: 'Médiane plus basse sans tomber à 0, jours à 4 ou plus toujours orange.',
    mesurer: () => {
      const { serie: s, pain } = reel()
      const tries = s.map((r) => r.idx).sort((a, b) => a - b)
      const mediane = tries[Math.floor(tries.length / 2)]
      const douloureux = s.filter((r) => DOULEUR_MAX(pain[r.day]) >= 4)
      const rates = douloureux.filter((r) => r.idx < 50).length
      return {
        valeur: `médiane ${mediane}, ${douloureux.length - rates} jour(s) douloureux sur ${douloureux.length} en orange`,
        ok: mediane > 0 && rates === 0,
      }
    },
  },
]
