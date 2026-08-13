/**
 * Génère supabase/seed.sql à partir des instantanés JSON.
 *
 *   node scripts/build-seed.mjs
 *
 * Le fichier produit importe le carnet de suivi (16 jours de juillet-août 2026)
 * et l'historique Strava (83 activités de mai à août 2026) dans le compte du
 * PREMIER utilisateur créé — donc le tien, après ta première connexion.
 * Aucun identifiant à recopier à la main.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const notion = read('src/data/notion-seed.json')
const strava = read('src/data/strava-seed.json')

/** Compte Supabase qui reçoit l'historique. */
const COMPTE = 'mathieu.franzen1@gmail.com'

/** Échappe une chaîne pour un littéral SQL. */
const q = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v == null || Number.isNaN(v) ? 'null' : String(v))
const b = (v) => (v ? 'true' : 'false')

// ─── carnet de suivi ────────────────────────────────────────────────────────
const logs = notion.map((r) => {
  // « Renfo Bas » dans les activités du jour = protocole excentrique effectué.
  const ecc = (r.activities ?? []).some((a) => /renfo bas/i.test(a))
  return `  (uid, ${q(r.date)}::date, ${n(r.painWake)}, ${n(r.painEffort)}, ${n(r.painEvening)}, ` +
    `${b(ecc)}, ${b(r.icing)}, ${b(r.jumps)}, ${n(r.hydration)}, ${q(r.mood)}, ` +
    `${q([r.detail, r.note].filter(Boolean).join(' — '))})`
})

// ─── activités Strava ───────────────────────────────────────────────────────
const SPORT = { Run: 'Run', Ride: 'Ride', Weight: 'Weight', Hike: 'Hike', Soccer: 'Soccer' }
const acts = strava.map((a, i) => {
  const externalId = `seed-${a.date}-${i}`
  return `  (uid, 'strava-seed', ${q(externalId)}, ${q(a.date)}::date, ${q(SPORT[a.sport] ?? a.sport)}, ` +
    `${q(a.name)}, ${n(Math.round(a.km * 1000))}, ${n(a.min * 60)}, ${n(a.eff)})`
})

const sql = `-- ════════════════════════════════════════════════════════════════════════════
--  Tendo — import de l'historique
--
--  À exécuter APRÈS schema.sql et APRÈS ta première connexion à l'app,
--  pour que ton compte existe. Éditeur SQL de Supabase, comme le schéma.
--
--  Généré par scripts/build-seed.mjs — ne pas modifier à la main.
--  ${logs.length} jours de carnet, ${acts.length} activités Strava.
-- ════════════════════════════════════════════════════════════════════════════

do $seed$
declare
  uid uuid;
begin
  -- Compte ciblé nommément : l'historique ne peut pas atterrir sur le mauvais
  -- utilisateur si un autre compte a été créé entre-temps.
  select id into uid from auth.users where email = ${q(COMPTE)};
  if uid is null then
    raise exception 'Aucun compte ${COMPTE}. Connecte-toi une fois à l''app avec cette adresse (lien magique) avant de lancer ce script.';
  end if;

  -- ─── Profil : objectif 3 h 15, calibré sur le test du 8 août 2026 ─────────
  update public.profiles set
    marathon_pace_s = 277,   -- 4:37/km
    fitness_pace_s  = 289,   -- 4:49/km, projection du test de 3 km
    test_3k_s       = 722,   -- 12:02
    test_3k_date    = '2026-08-08',
    hr_max          = 181,   -- mesurée, et non les 193 supposées par Strava
    goal_label      = '3 h 15',
    race_date       = '2027-04-11',
    plan_start      = '2026-08-10'
  where id = uid;

  -- ─── Carnet de suivi du tendon ────────────────────────────────────────────
  insert into public.daily_logs
    (user_id, day, pain_wake, pain_effort, pain_evening,
     eccentric, icing, jumps, hydration_l, mood, note)
  values
${logs.join(',\n')}
  on conflict (user_id, day) do update set
    pain_wake    = excluded.pain_wake,
    pain_effort  = excluded.pain_effort,
    pain_evening = excluded.pain_evening,
    eccentric    = excluded.eccentric,
    icing        = excluded.icing,
    jumps        = excluded.jumps,
    hydration_l  = excluded.hydration_l,
    mood         = excluded.mood,
    note         = excluded.note;

  -- ─── Historique Strava ────────────────────────────────────────────────────
  insert into public.activities
    (user_id, source, external_id, day, sport, name, distance_m, moving_s, relative_effort)
  values
${acts.join(',\n')}
  on conflict (user_id, source, external_id) do nothing;

  raise notice 'Import terminé : % jours de carnet, % activités.',
    ${logs.length}, ${acts.length};
end $seed$;
`

writeFileSync(join(root, 'supabase/seed.sql'), sql)
console.log(
  `supabase/seed.sql écrit — ${logs.length} jours de carnet, ${acts.length} activités.`,
)
