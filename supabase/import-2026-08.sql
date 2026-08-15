-- ════════════════════════════════════════════════════════════════════════════
--  Tendo — appoint Strava, du 10 au 14 août 2026
--
--  Le seed s'arrête au 9 août. Ces trois activités comblent le trou, en
--  attendant que la synchro Strava automatique soit branchée (étape 5 du
--  README). À jouer une fois dans l'éditeur SQL de Supabase.
--
--  IMPORTANT — pourquoi source = 'strava' et pas 'strava-seed' :
--  la contrainte d'unicité porte sur (user_id, source, external_id). Les
--  identifiants ci-dessous sont les VRAIS identifiants Strava, donc le jour où
--  la synchro tourne, elle retombera exactement sur ces lignes et les mettra à
--  jour. Avec 'strava-seed' et un identifiant fabriqué, elle aurait créé des
--  doublons et la charge du tendon aurait compté chaque sortie deux fois.
--
--  La FC n'est renseignée que là où elle était disponible ; la synchro
--  complètera le reste au premier passage.
-- ════════════════════════════════════════════════════════════════════════════

do $import$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = 'mathieu.franzen1@gmail.com';
  if uid is null then
    raise exception 'Aucun compte mathieu.franzen1@gmail.com.';
  end if;

  insert into public.activities
    (user_id, source, external_id, day, started_at, sport, name,
     distance_m, moving_s, elapsed_s, elevation_m, avg_hr, max_hr, avg_watts, relative_effort)
  values
    (uid, 'strava', '19686319064', '2026-08-10'::date, '2026-08-10T20:53:44+02:00',
     'Ride', 'Home trainer',            0,     2415, 2415,   0.0, null,  null, null,  7),
    (uid, 'strava', '19710336654', '2026-08-12'::date, '2026-08-12T09:06:05+02:00',
     'Run',  'Course à pied le matin',  7051.0, 2246, 2263, 107.2, 142.0, 161.0, 215.6, 46),
    (uid, 'strava', '19735078402', '2026-08-14'::date, '2026-08-14T08:37:38+02:00',
     'Run',  'Course à pied le matin',  7080.1, 2336, 2339, 105.8, null,  null, null,  37)
  on conflict (user_id, source, external_id) do update set
    day             = excluded.day,
    started_at      = excluded.started_at,
    sport           = excluded.sport,
    name            = excluded.name,
    distance_m      = excluded.distance_m,
    moving_s        = excluded.moving_s,
    elapsed_s       = excluded.elapsed_s,
    elevation_m     = excluded.elevation_m,
    avg_hr          = coalesce(excluded.avg_hr, public.activities.avg_hr),
    max_hr          = coalesce(excluded.max_hr, public.activities.max_hr),
    avg_watts       = coalesce(excluded.avg_watts, public.activities.avg_watts),
    relative_effort = excluded.relative_effort;

  raise notice 'Appoint terminé : 3 activités du 10 au 14 août.';
end $import$;
