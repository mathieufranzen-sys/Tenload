/**
 * Écran Suivi, porté depuis reference/tendo-v3.html (`vTrack`).
 *
 * Quatre graphiques, deux d'entre eux avec une bascule de lecture : la douleur
 * en trois moments ou en cumul, le volume en course seule ou avec le vélo.
 * Le bloc « Protocole tendon » de la référence a été retiré à la demande de
 * Mathieu — les gestes protecteurs se saisissent dans Aujourd'hui et pèsent
 * dans l'indice, un décompte de plus n'apportait rien.
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import planJson from '../data/plan.json'
import type { Plan } from '../data/types'
import type { SessionType } from '../data/types'
import { addDays, formatDay, formatNumber, mondayOf, today as todayISO } from '../lib/dates'
import { adapt, construireContexte, seancesDeLaSemaine } from '../lib/adapt'
import { familleDe, familleDuSport } from '../lib/insights'
import type { EcartRow } from '../lib/overrides'
import { Icon } from '../components/Icon'
import type { LoadMap, PainMap } from '../lib/tendonIndex'
import type { ActivityRow, LoadParDiscipline } from '../lib/load'
import type { FeedbackRow } from '../lib/buildPain'
import { IndexChart } from '../components/charts/IndexChart'
import { PainChart, type PainRow, type VuePain } from '../components/charts/PainChart'
import { VolumeChart, type BarRow, type VueVolume } from '../components/charts/VolumeChart'
import { LoadChart, type StackRow } from '../components/charts/LoadChart'
import { MeshBackground } from '../components/MeshBackground'
import { EffortChart, FormeChart } from '../components/charts/NiveauChart'
import { MIN_SEANCES, RPE_ATTENDU, serieForme, type AjustementForme } from '../lib/forme'
import { RepartitionChart } from '../components/charts/RepartitionChart'
import { RatioChart, type PointRatio } from '../components/charts/RatioChart'
import { chronoEquivalent, formatChrono } from '../lib/dossards'
import { HALF_KM } from '../lib/paces'
import { repartitionSemaine } from '../lib/repartition'
import { MARATHON_KM } from '../lib/paces'
import { Segmented } from '../components/Segmented'
import { EnteteEcran } from '../components/EnteteEcran'

const plan = planJson as unknown as Plan

/** Les quatre distances qui se courent, de la plus courte à la plus longue. */
const DISTANCES_EQUIVALENTES: Array<[string, number]> = [
  ['5 km', 5],
  ['10 km', 10],
  ['Semi-marathon', HALF_KM],
  ['Marathon', MARATHON_KM],
]

/** Les lignes du tableau des chronos : même filet, même hauteur, alignées. */
const LIGNE_EQ = {
  padding: '10px 0',
  borderTop: '1px solid var(--border)',
  fontSize: 'var(--fs-texte)',
  color: 'var(--ink-2)',
} as const
const VALEUR_EQ = {
  fontSize: 'var(--fs-c-s)',
  textAlign: 'right',
  color: 'var(--ink)',
  fontVariantNumeric: 'tabular-nums',
} as const

interface Props {
  load: LoadMap
  /** Le même coût que `load`, réparti par discipline plutôt que sommé. */
  loadParDiscipline: Record<string, LoadParDiscipline>
  pain: PainMap
  activities: ActivityRow[]
  feedback: FeedbackRow[]
  /**
   * Séances des jours révolus qui attendent encore leur ressenti. Calculé dans
   * `App` par `seancesANoter`, pour que le compte affiché ici et la liste de
   * la page « Séances à noter » ne puissent pas diverger.
   */
  notesEnRetard: number
  /** Ouvre la liste de ces séances. Absent en mode instantanés. */
  onVoirANoter?: () => void
  /** Forme du dernier test, l'ancre des graphiques de niveau. */
  formeTest: number
  /** Allure marathon visée, pour la ligne d'objectif. */
  marathonPace: number
  /** La forme projetée du jour, ressenti compris. */
  forme: AjustementForme
  /** Pour les compteurs de la semaine, calculés comme sur Aujourd'hui. */
  ecarts?: Map<string, EcartRow>
  attestes?: Set<string>
  onOuvrirProfil: () => void
}

/**
 * Catégorie qualitative, pondérée comme le modèle : la douleur de fin de
 * journée compte plus que le réveil, c'est le signal le plus fiable chez lui.
 */
function santeDuTendon(reveil: number | null, soir: number | null): { label: string; couleur?: string } {
  const vals: number[] = []
  const poids: number[] = []
  if (reveil != null) { vals.push(reveil); poids.push(0.4) }
  if (soir != null) { vals.push(soir); poids.push(0.6) }
  if (!vals.length) return { label: '—' }
  const total = poids.reduce((a, b) => a + b, 0)
  const score = vals.reduce((a, v, i) => a + v * poids[i], 0) / total
  if (score <= 1) return { label: 'Excellente', couleur: 'var(--good)' }
  if (score <= 2.5) return { label: 'Bonne', couleur: 'var(--good)' }
  if (score <= 4) return { label: 'Correcte', couleur: 'var(--warning)' }
  if (score <= 6) return { label: 'Sensible', couleur: 'var(--serious)' }
  return { label: 'Mauvaise', couleur: 'var(--critical)' }
}

export function Track({
  load,
  loadParDiscipline,
  pain,
  activities,
  feedback,
  notesEnRetard,
  onVoirANoter,
  formeTest,
  marathonPace,
  forme,
  ecarts,
  attestes,
  onOuvrirProfil,
}: Props) {
  const now = todayISO()
  const A = useMemo(() => adapt(load, pain, feedback, now), [load, pain, feedback, now])

  // Les compteurs de la semaine ont quitté la jauge d'Aujourd'hui le
  // 22 septembre. Ils se calculent ici exactement comme là-bas (charge
  // attestée comprise), pour que l'indice d'hier cité soit le même chiffre.
  // La semaine en cours, pour la répartition de la course : mêmes séances
  // que l'écran Aujourd'hui, écarts et adaptations compris.
  const { semaineN, seancesSemaine } = useMemo(() => {
    const aJour = adapt(load, pain, feedback, now, attestes)
    const contexte = construireContexte(plan.weeks, feedback, pain, now, ecarts)
    const semaine =
      plan.weeks.find((w) => now >= w.monday && now <= addDays(w.monday, 6)) ??
      plan.weeks[now < plan.weeks[0].monday ? 0 : plan.weeks.length - 1]
    return {
      semaineN: semaine.n,
      seancesSemaine: seancesDeLaSemaine(plan.weeks, semaine, now, aJour.byDate, ecarts, contexte),
    }
  }, [load, pain, feedback, now, attestes, ecarts])
  const repartition = useMemo(
    () => repartitionSemaine(seancesSemaine.map((x) => x.s), marathonPace),
    [seancesSemaine, marathonPace],
  )

  const [vuePain, setVuePain] = useState<VuePain>('separee')
  const [vueVolume, setVueVolume] = useState<VueVolume>('course')

  const jours = useMemo(() => Object.keys(pain).sort(), [pain])
  // Fenêtres ancrées sur le dernier jour réellement saisi, pas sur aujourd'hui :
  // si le carnet a deux jours de retard, les KPI restent lisibles plutôt que vides.
  const painRef = jours.length ? jours[jours.length - 1] : now
  const fenetre = (from: number, to: number) =>
    jours.filter((d) => d > addDays(painRef, -to) && d <= addDays(painRef, -from))
  // Santé du tendon lit 30 jours, pas 7 : une catégorie qui bascule sur une
  // semaine chargée n'aide pas, c'est une lecture de fond qu'on veut ici.
  const last30 = fenetre(0, 30)

  const moyenne = (liste: string[], champ: 'wake' | 'effort' | 'evening'): number | null => {
    const vs = liste.map((d) => pain[d]?.[champ]).filter((v): v is number => v != null)
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
  }

  const reveil30 = moyenne(last30, 'wake')
  const soir30 = moyenne(last30, 'evening')
  const sante = santeDuTendon(reveil30, soir30)

  /**
   * Kilomètres de course par jour : Strava quand il a la sortie, le ressenti
   * sinon. Même règle que le graphique de volume juste en dessous, pour que
   * les deux chiffres de la page ne se contredisent jamais.
   */
  const kmCourseParJour = useMemo(() => {
    const m = new Map<string, number>()
    const importe = new Set<string>()
    for (const a of activities) {
      if (familleDuSport(a.sport) !== 'course') continue
      m.set(a.day, (m.get(a.day) ?? 0) + a.distance_m / 1000)
      importe.add(a.day)
    }
    for (const f of feedback) {
      if (familleDe(f.session_type as SessionType) !== 'course') continue
      if (f.distance_km == null || importe.has(f.day)) continue
      m.set(f.day, (m.get(f.day) ?? 0) + f.distance_km)
    }
    return m
  }, [activities, feedback])

  // Fenêtre ancrée sur aujourd'hui : « sur 7 jours » doit vouloir dire les
  // sept derniers jours, pas les sept jours précédant la dernière synchro.
  const km = (depuis: number) =>
    [...kmCourseParJour.entries()]
      .filter(([d]) => d > addDays(now, -depuis) && d <= now)
      .reduce((s, [, v]) => s + v, 0)
  const km7 = km(7)
  const km28 = km(28)

  const totalAttendu = plan.weeks.reduce((acc, w) => acc + w.sessions.filter((s) => s.feedback).length, 0)


  const idxRows = useMemo(
    () =>
      Object.values(A.byDate)
        .sort((a, b) => (a.day < b.day ? -1 : 1))
        .map((r) => ({ day: r.day, idx: r.idx })),
    [A.byDate],
  )

  /** Le rapport aigu sur chronique jour par jour, jusqu'à aujourd'hui. */
  const ratioRows: PointRatio[] = useMemo(
    () =>
      Object.values(A.byDate)
        .filter((r) => r.day <= now && r.acr > 0)
        .sort((x, y) => (x.day < y.day ? -1 : 1))
        .map((r) => ({ day: r.day, acr: r.acr })),
    [A.byDate, now],
  )

  const painRows: PainRow[] = useMemo(
    () =>
      jours.map((d) => ({
        day: d,
        wake: pain[d]?.wake ?? null,
        effort: pain[d]?.effort ?? null,
        evening: pain[d]?.evening ?? null,
      })),
    [jours, pain],
  )

  /**
   * Volume hebdomadaire, Strava d'abord et le ressenti pour compléter.
   *
   * La course ne lisait que Strava : sans synchronisation, les kilomètres
   * déclarés dans les ressentis n'apparaissaient nulle part et le graphique
   * semblait figé. L'écran Aujourd'hui, lui, comptait déjà les ressentis —
   * les deux écrans donnaient des totaux différents pour la même semaine.
   *
   * Une journée couverte par Strava ignore son ressenti, sinon la séance
   * compterait deux fois.
   */
  const volumeRows: BarRow[] = useMemo(() => {
    const parSemaine = new Map<string, { course: number; velo: number }>()
    const importe = { course: new Set<string>(), velo: new Set<string>() }

    for (const a of activities) {
      const f = familleDuSport(a.sport)
      if (f !== 'course' && f !== 'velo') continue
      const lundi = mondayOf(a.day)
      const cur = parSemaine.get(lundi) ?? { course: 0, velo: 0 }
      cur[f] += a.distance_m / 1000
      importe[f].add(a.day)
      parSemaine.set(lundi, cur)
    }

    for (const f of feedback) {
      const famille = familleDe(f.session_type as SessionType)
      if (famille !== 'course' && famille !== 'velo') continue
      if (f.distance_km == null || importe[famille].has(f.day)) continue
      const lundi = mondayOf(f.day)
      const cur = parSemaine.get(lundi) ?? { course: 0, velo: 0 }
      cur[famille] += f.distance_km
      parSemaine.set(lundi, cur)
    }

    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, v]) => ({
        label: formatDay(lundi),
        course: Math.round(v.course * 10) / 10,
        velo: Math.round(v.velo * 10) / 10,
      }))
  }, [activities, feedback])

  // Le même coût que l'indice de charge, réparti par discipline et regroupé
  // par semaine — pas l'effort relatif de Strava, que Strava calcule à sa
  // façon et sans rapport avec le modèle de l'app.
  const loadRows: StackRow[] = useMemo(() => {
    const vide = () => ({ course: 0, velo: 0, autre: 0 })
    const parSemaine = new Map<string, { total: LoadParDiscipline; projete: LoadParDiscipline }>()
    for (const [day, v] of Object.entries(loadParDiscipline)) {
      const lundi = mondayOf(day)
      const cur = parSemaine.get(lundi) ?? { total: vide(), projete: vide() }
      // Après aujourd'hui, la charge vient du plan et pas du réalisé : elle
      // reste comptée, mais séparément, pour que le graphique puisse la
      // montrer comme une intention.
      const cible = day > now ? [cur.total, cur.projete] : [cur.total]
      for (const c of cible) {
        c.course += v.course
        c.velo += v.velo
        c.autre += v.autre
      }
      parSemaine.set(lundi, cur)
    }
    return [...parSemaine.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([lundi, v]) => ({
        label: formatDay(lundi),
        course: Math.round(v.total.course),
        velo: Math.round(v.total.velo),
        autre: Math.round(v.total.autre),
        projete: {
          course: Math.round(v.projete.course),
          velo: Math.round(v.projete.velo),
          autre: Math.round(v.projete.autre),
        },
      }))
  }, [loadParDiscipline, now])

  // Le niveau en course sur les douze dernières semaines, un point par lundi
  // plus aujourd'hui : la forme telle que l'app l'aurait affichée ce jour-là.
  const niveau = useMemo(() => {
    const lundiCourant = mondayOf(now)
    const lundis = Array.from({ length: 12 }, (_, k) => addDays(lundiCourant, -7 * (11 - k)))
    const dates = [...lundis.slice(1), now]
    const forme = serieForme(formeTest, feedback, dates).map((f, i) => ({
      label: i === dates.length - 1 ? "auj." : formatDay(dates[i]),
      minutes: Math.round((f.allure * MARATHON_KM) / 60),
      secondes: Math.round(f.allure * MARATHON_KM),
      lu: f.seances >= MIN_SEANCES,
    }))
    // Séance par séance sur un mois (retour du 23 septembre) : une moyenne
    // par semaine sur trois mois lissait tout ce qu'on vient y voir, et
    // quinze jours ne montraient pas assez de séances pour juger.
    const depuis = addDays(now, -29)
    const effort = feedback
      .filter((f) => f.day >= depuis && f.day <= now && RPE_ATTENDU[f.session_type as SessionType] != null)
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .map((f) => ({
        label: formatDay(f.day),
        ecart: f.rpe - (RPE_ATTENDU[f.session_type as SessionType] as number),
      }))
    return { forme, effort }
  }, [formeTest, feedback, now])

  const volumeAffiche =
    vueVolume === 'cumul'
      ? volumeRows.reduce((s, r) => s + r.course + r.velo, 0)
      : volumeRows.reduce((s, r) => s + r.course, 0)

  return (
    <div style={{ position: 'relative', maxWidth: 'var(--shell-max)', margin: '0 auto', paddingBottom: 90 }}>
      <MeshBackground band={A.band.key} disposition="bords" />

      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '0 var(--page-x) 0',
      }}>
        <EnteteEcran
          titre="Suivi"
          onOuvrirProfil={onOuvrirProfil}
        />

        {/* Trois chiffres, chacun dans une carte grise comme les graphiques
            qui suivent. Ceux de la semaine en cours sont partis le
            23 septembre : ils répétaient ce que dit l'écran Aujourd'hui. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Kpi
            label="Course sur 7 jours"
            valeur={formatNumber(km7)}
            suffix=" km"
            detail={`${formatNumber(km28)} km sur 28 j`}
          />
          <Kpi
            label="Santé du tendon"
            valeur={sante.label}
            suffix=""
            couleur={sante.couleur}
            detail="Douleur des 30 derniers jours"
          />
          <Kpi
            label="Seuil cette semaine"
            valeur={`${repartition.seuil}`}
            suffix=" min"
            couleur={repartition.seuil >= 20 ? 'var(--good)' : undefined}
            detail="Cible 20 à 30 min"
          />
          <Kpi
            label="Séances notées"
            valeur={`${feedback.length}`}
            suffix={` / ${totalAttendu}`}
            detail={notesEnRetard > 0 ? 'Aller les noter' : 'Depuis le 10 août'}
            tag={notesEnRetard > 0 ? `${notesEnRetard} en retard` : undefined}
            onClick={notesEnRetard > 0 ? onVoirANoter : undefined}
          />
        </div>

        <Viz
          titre="Indice de charge du tendon"
        >
          <IndexChart series={idxRows} now={now} />
        </Viz>

        <Viz
          titre="Douleur par jour"
          controle={
            <Segmented
              label="Lecture de la douleur"
              valeur={vuePain}
              onChange={setVuePain}
              options={[
                { cle: 'separee', libelle: 'Détaillé' },
                { cle: 'cumulee', libelle: 'Cumulé' },
              ]}
            />
          }
          // Mêmes trois entrées dans les deux vues : empilées ou séparées, une
          // couleur ne désigne toujours qu'une seule mesure.
          legendeCouleurs={[
            { label: 'Réveil', couleur: 'var(--chart-1)' },
            { label: "Pendant l'effort", couleur: 'var(--chart-2)' },
            { label: 'Fin de journée', couleur: 'var(--chart-3)' },
          ]}
        >
          <PainChart rows={painRows} vue={vuePain} />
        </Viz>

        <Viz
          titre="Niveau en course"
          legendeCouleurs={[
            { label: 'Marathon projeté', couleur: 'var(--chart-1)' },
            { label: 'Objectif', couleur: 'var(--chart-3)' },
          ]}
          note={(() => {
            const f = niveau.forme
            const d = f.length > 1 ? f[f.length - 1].minutes - f[0].minutes : 0
            return d === 0 ? 'Stable sur 12 semaines' : `${d < 0 ? '−' : '+'}${Math.abs(d)} min sur 12 semaines`
          })()}
        >
          <FormeChart points={niveau.forme} objectif={Math.round((marathonPace * MARATHON_KM) / 60)} />
        </Viz>

        <Viz
          titre="Effort perçu contre effort attendu, 30 jours"
          legendeCouleurs={[
            { label: 'Plus facile que prévu', couleur: 'var(--chart-1)' },
            { label: 'Plus dur', couleur: 'var(--chart-2)' },
          ]}
        >
          <EffortChart points={niveau.effort} />
        </Viz>

        {/* Le temps de la semaine par intensité, en anneau (demandé le
            22 septembre) : le plan de la semaine en cours, écarts et
            adaptations compris, séances sautées exclues. */}
        {/* Ce que ta forme du jour vaut sur les autres distances, et ce que
            l'objectif du 4 avril y vaudrait. Même équivalence que le recalage
            d'un chrono de course, prise à l'envers (`chronoEquivalent`). */}
        <Viz titre="Chronos équivalents">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 18 }}>
            <span />
            <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--accent)', textAlign: 'right', paddingBottom: 6 }}>
              Aujourd'hui
            </span>
            <span style={{ fontSize: 'var(--fs-detail)', color: 'var(--bleu-700)', textAlign: 'right', paddingBottom: 6 }}>
              Visé le 4 avril
            </span>
            {DISTANCES_EQUIVALENTES.map(([libelle, km]) => (
              <Fragment key={libelle}>
                <span style={LIGNE_EQ}>{libelle}</span>
                <span className="chiffre" style={{ ...LIGNE_EQ, ...VALEUR_EQ }}>
                  {formatChrono(chronoEquivalent(km, forme.allure))}
                </span>
                <span className="chiffre" style={{ ...LIGNE_EQ, ...VALEUR_EQ, color: 'var(--bleu-700)' }}>
                  {formatChrono(chronoEquivalent(km, marathonPace))}
                </span>
              </Fragment>
            ))}
          </div>
        </Viz>

        <Viz titre="Rapport aigu sur chronique">
          <RatioChart points={ratioRows} now={now} />
        </Viz>

        <Viz titre={`Répartition de la course, semaine ${semaineN}`}>
          <RepartitionChart minutes={repartition} />
        </Viz>

        <Viz
          titre="Volume par semaine"
          controle={
            <Segmented
              label="Lecture du volume"
              valeur={vueVolume}
              onChange={setVueVolume}
              options={[
                { cle: 'course', libelle: 'Course' },
                { cle: 'cumul', libelle: 'Course + vélo' },
              ]}
            />
          }
          legendeCouleurs={
            vueVolume === 'cumul'
              ? [
                  { label: 'Course', couleur: 'var(--chart-1)' },
                  { label: 'Vélo', couleur: 'var(--chart-2)' },
                ]
              : undefined
          }
          note={`${formatNumber(Math.round(volumeAffiche))} km au total sur la période`}
        >
          <VolumeChart rows={volumeRows} vue={vueVolume} />
        </Viz>

        <Viz
          titre="Charge d'entraînement par semaine"
          legendeCouleurs={[
            { label: 'Course', couleur: 'var(--chart-1)' },
            { label: 'Vélo', couleur: 'var(--chart-2)' },
            { label: 'Muscu, escalade, autres', couleur: 'var(--chart-3)' },
          ]}
        >
          <LoadChart rows={loadRows} />
        </Viz>
      </div>
    </div>
  )
}

function Kpi({
  label,
  valeur,
  suffix,
  detail,
  couleur,
  tag,
  onClick,
}: {
  label: string
  valeur: string
  suffix: string
  detail?: string
  couleur?: string
  /**
   * Étiquette d'alerte, sur la MÊME ligne que le libellé : elle le qualifie,
   * l'empiler dessous en faisait une information de plus alors que c'en est
   * la nuance. « 12 / 310 » et « 3 en retard » se lisent ensemble ou pas.
   */
  tag?: string
  /** Rend la tuile cliquable quand elle mène quelque part. */
  onClick?: () => void
}) {
  const Balise = onClick ? 'button' : 'div'
  return (
    <Balise
      className="carte"
      onClick={onClick}
      style={{
        padding: '14px 14px 13px',
        width: '100%',
        textAlign: 'left',
        color: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        display: 'block',
        borderRadius: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="chiffre" style={{ fontSize: valeur.length > 6 ? 'var(--fs-c-m)' : 'var(--fs-c-l)', lineHeight: 1, color: couleur }}>
          {valeur}
        </span>
        {suffix && <span style={{ fontSize: 'var(--fs-texte)', color: 'var(--accent)' }}>{suffix.trim()}</span>}
      </div>
      <div style={{ fontSize: 'var(--fs-meta)', marginTop: 8, color: tag ? 'var(--warning)' : 'var(--accent)', lineHeight: 1.3 }}>
        {label}
        {tag && ` · ${tag}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-detail)', marginTop: 3, color: 'var(--sur-ink-3)', lineHeight: 1.35 }}>
        <span style={{ flex: 1, minWidth: 0 }}>{detail}</span>
        {onClick && <Icon name="chevronRight" size={13} style={{ flex: 'none', strokeWidth: 2 }} />}
      </div>
    </Balise>
  )
}

function Viz({
  titre,
  controle,
  legendeCouleurs,
  note,
  children,
}: {
  titre: string
  controle?: ReactNode
  legendeCouleurs?: Array<{ label: string; couleur: string }>
  note?: string
  children: ReactNode
}) {
  return (
    <section className="carte" style={{ padding: '18px 18px', marginBottom: 12 }}>
      <h2 className="display" style={{ margin: '0 0 6px', fontSize: 'var(--fs-t-carte)', lineHeight: 1.2, }}>
        {titre}
      </h2>
      {controle && <div style={{ marginTop: 14 }}>{controle}</div>}
      {/* Toile sombre sous le tracé : sur le verre seul, les bandes de fond de
          l'indice et la palette saturée se délavent contre le dégradé. */}
      {/* Plus de toile blanche sous le tracé : une couche de plus dans une
          carte déjà grise (retour du 22 septembre). */}
      <div style={{ marginTop: 18 }}>{children}</div>
      {(legendeCouleurs || note) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            marginTop: 10,
          }}
        >
          {legendeCouleurs?.map((l) => (
            <span
              key={l.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 'var(--fs-detail)',
                fontWeight: 500,
                color: 'var(--sur-ink-2)',
              }}
            >
              <b style={{ width: 14, height: 3, borderRadius: 2, background: l.couleur, flex: 'none' }} />
              {l.label}
            </span>
          ))}
          {note && (
            <span style={{ fontSize: 'var(--fs-detail)', fontWeight: 500, color: 'var(--sur-ink-3)', marginLeft: 'auto' }}>
              {note}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
