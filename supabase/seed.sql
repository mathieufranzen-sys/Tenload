-- ════════════════════════════════════════════════════════════════════════════
--  Tendo — import de l'historique
--
--  À exécuter APRÈS schema.sql et APRÈS ta première connexion à l'app,
--  pour que ton compte existe. Éditeur SQL de Supabase, comme le schéma.
--
--  Généré par scripts/build-seed.mjs — ne pas modifier à la main.
--  23 jours de carnet, 83 activités Strava.
-- ════════════════════════════════════════════════════════════════════════════

do $seed$
declare
  uid uuid;
begin
  -- Compte ciblé nommément : l'historique ne peut pas atterrir sur le mauvais
  -- utilisateur si un autre compte a été créé entre-temps.
  select id into uid from auth.users where email = 'mathieu.franzen1@gmail.com';
  if uid is null then
    raise exception 'Aucun compte mathieu.franzen1@gmail.com. Connecte-toi une fois à l''app avec cette adresse (lien magique) avant de lancer ce script.';
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
  (uid, '2026-07-20'::date, 0, 1, 5, false, true, false, 2, '🤔', 'échauffement 10”
3x10” Z3 + 3” repos
retour au calme 11” — séance bien vécue, surprise douleur à l’arrêt'),
  (uid, '2026-07-21'::date, 0, 2, 0, false, false, true, 1.5, '😎', 'EF a 5:40 — Jambes lourdes, genoux sensibles pendant la course'),
  (uid, '2026-07-22'::date, 0, 1, 1, false, false, true, 1.5, '😌', '3x20 sauts / jambes (protocole kiné)
3x1” pointe de pied statique / jambe
3x1” pointe de pied genou fléchi / jambe — Légère douleur sur la dernière série de saut unilatérale (tendon pied droit)'),
  (uid, '2026-07-23'::date, 0, 0, 0, false, false, true, 1, '🫪', '6x800m à 4:10 — Super bon ressenti sur course'),
  (uid, '2026-07-24'::date, 0.5, 0, 2, false, false, true, 1.5, '😎', '11 km EF 236d+'),
  (uid, '2026-07-25'::date, 2, 2, 2, false, false, false, 1, '🤔', 'EF'),
  (uid, '2026-07-26'::date, 1, 1, 0.5, false, true, true, 1.5, '☺️', '10km EF + 9km objectif 5:10 — Protocole de course : 10” de course / 1” de marche  
2x 35” de vélo calme'),
  (uid, '2026-07-27'::date, 1, 0, 0, false, false, false, 0.5, '😌', 'Voûtes plantaires et genou — Repos nécessaire ressenti'),
  (uid, '2026-07-28'::date, 0, 0, 1, false, false, false, 1, '💪', '• Stanish
  • Pompes, dvlp militaire, curl, crunch
  • Vélo 40min EF'),
  (uid, '2026-07-29'::date, 0, 0, 0, false, false, false, 1.5, '☺️', '5b+, 5c lead, 6a, 5c+ lead, 6b fail'),
  (uid, '2026-07-30'::date, 0, 1, 2, false, true, false, 2.5, '😅', '23km en EF — Aucune douleur en course. Ko musculairement et mauvaise gestion nutriment'),
  (uid, '2026-07-31'::date, 2, 0, 1, false, false, false, 1.5, '🥴', null),
  (uid, '2026-08-01'::date, 1, 0, 3, false, false, false, 1.5, '☺️', '3x 1km à 4:50 + 1km à 4:30 — Légère douleur au genou gauche'),
  (uid, '2026-08-02'::date, 1, 2, 2, false, true, false, 2, '😅', '30km à vélo EF + 7km course EF — Légère douleur au genou et tendon d’Achille des deux côtés'),
  (uid, '2026-08-03'::date, 3, 0, 2, true, false, true, 1.5, '🥵', 'Stanish 2x10(12kg), pointes de pied statique 3x1” (12kg), pied creu 3x45’, soulève de terre unilatéral 3x12 (10kg), hip extenseur unilatéral 3x10, fentes bulgares 3x10 (2x6kg), crabe walk 3x12/cote, squat talonnette 3x16 (2x6kg) + 30” velo Z3 — Pas de douleur aux genoux pendant la séance'),
  (uid, '2026-08-04'::date, 1, 0, 0, false, false, false, 2, '😢', 'Courbaturé
Entorse cheville gauche après 600m, retour maison en marchant'),
  (uid, '2026-08-05'::date, 0, 0, 0, false, true, false, 2, '🤨', '30” — Douleur sur maléole extérieure gauche de la cheville à la palpation, glace 3x, repos forcé 
Pompes lestées, élévation latérale, gainage, crunch, bicep curl'),
  (uid, '2026-08-06'::date, 0, 0, 0, false, false, true, null, '😌', '50” Z2 — Pied gauche Maléole sensible au touché, rotation complète du pied quasi sans ressenti
Test de proprio, sauts et stanish pour tester la cheville'),
  (uid, '2026-08-07'::date, 0, 1, 3, false, true, true, null, '😎', '10 km EF — Pulvérisation de l’allure 5’20 en EF + douleur cheville gauche'),
  (uid, '2026-08-08'::date, 1, 0, 1, false, true, true, 1, '😊', 'Test d’aptitude 3000m — Jambes lourdes ou courbatures en fin de journée'),
  (uid, '2026-08-09'::date, 4, 2, 3, false, true, true, 2, '☺️', '25km en EF à 5:37 — Mal au genou gauche sur les derniers km et douleur à froid après en flexion'),
  (uid, '2026-08-10'::date, 2, 0, 3, false, true, false, 1, '☺️', '13km 70rpm — Douleur au genou pendant toute la séance'),
  (uid, '2026-08-11'::date, 3, 0, 4, false, true, false, 1.5, '😐', 'Douleur au genou gauche')
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
  (uid, 'strava-seed', 'seed-2026-05-01-0', '2026-05-01'::date, 'Run', 'Le long de la digue', 12020, 4320, 31),
  (uid, 'strava-seed', 'seed-2026-05-02-1', '2026-05-02'::date, 'Hike', 'Col de cloche', 6010, 7260, 13),
  (uid, 'strava-seed', 'seed-2026-05-04-2', '2026-05-04'::date, 'Run', 'Aller-retour pharmacie', 15010, 5880, 75),
  (uid, 'strava-seed', 'seed-2026-05-06-3', '2026-05-06'::date, 'Run', 'Jamais plate cette région', 11930, 4620, 52),
  (uid, 'strava-seed', 'seed-2026-05-09-4', '2026-05-09'::date, 'Hike', 'Randonnée sans sentier', 4450, 6060, 9),
  (uid, 'strava-seed', 'seed-2026-05-10-5', '2026-05-10'::date, 'Run', 'Course sous la pluie', 10030, 3240, 78),
  (uid, 'strava-seed', 'seed-2026-05-10-6', '2026-05-10'::date, 'Hike', 'Randonnée le matin', 4000, 4020, 5),
  (uid, 'strava-seed', 'seed-2026-05-12-7', '2026-05-12'::date, 'Hike', 'Randonnée sans sentier 2', 9560, 10020, 21),
  (uid, 'strava-seed', 'seed-2026-05-12-8', '2026-05-12'::date, 'Run', 'Course à pied le matin', 5050, 1860, 21),
  (uid, 'strava-seed', 'seed-2026-05-15-9', '2026-05-15'::date, 'Run', '6x200m', 6010, 1980, 43),
  (uid, 'strava-seed', 'seed-2026-05-16-10', '2026-05-16'::date, 'Run', 'Aller-retour voiture', 7060, 2400, 41),
  (uid, 'strava-seed', 'seed-2026-05-18-11', '2026-05-18'::date, 'Run', 'Semi', 21220, 7140, 166),
  (uid, 'strava-seed', 'seed-2026-05-20-12', '2026-05-20'::date, 'Run', 'Course à pied en soirée', 10010, 3480, 42),
  (uid, 'strava-seed', 'seed-2026-05-21-13', '2026-05-21'::date, 'Run', 'Course à pied dans l''après-midi', 9010, 3180, 62),
  (uid, 'strava-seed', 'seed-2026-05-23-14', '2026-05-23'::date, 'Run', 'Course à pied en soirée', 12030, 4080, 61),
  (uid, 'strava-seed', 'seed-2026-05-24-15', '2026-05-24'::date, 'Run', 'Course à pied en soirée', 4040, 1920, 5),
  (uid, 'strava-seed', 'seed-2026-05-26-16', '2026-05-26'::date, 'Run', 'Course à pied le midi', 10010, 3840, 71),
  (uid, 'strava-seed', 'seed-2026-05-27-17', '2026-05-27'::date, 'Run', 'Course à pied en soirée', 10000, 3180, 96),
  (uid, 'strava-seed', 'seed-2026-05-29-18', '2026-05-29'::date, 'Ride', 'Col d''Allos', 36790, 9240, 82),
  (uid, 'strava-seed', 'seed-2026-05-30-19', '2026-05-30'::date, 'Hike', 'Lac de la Cayolle', 11230, 11640, 28),
  (uid, 'strava-seed', 'seed-2026-05-31-20', '2026-05-31'::date, 'Run', 'Course à pied en soirée', 6020, 2100, 39),
  (uid, 'strava-seed', 'seed-2026-05-31-21', '2026-05-31'::date, 'Hike', 'Les eaux tortes, Laverq', 18430, 17760, 38),
  (uid, 'strava-seed', 'seed-2026-06-02-22', '2026-06-02'::date, 'Run', 'Juste wow', 12100, 3720, 106),
  (uid, 'strava-seed', 'seed-2026-06-04-23', '2026-06-04'::date, 'Run', 'Course à pied dans l''après-midi', 19020, 6540, 119),
  (uid, 'strava-seed', 'seed-2026-06-05-24', '2026-06-05'::date, 'Run', 'Course à pied en soirée', 11200, 3660, 74),
  (uid, 'strava-seed', 'seed-2026-06-06-25', '2026-06-06'::date, 'Run', 'Course à pied en soirée', 7910, 2460, 67),
  (uid, 'strava-seed', 'seed-2026-06-08-26', '2026-06-08'::date, 'Run', 'Course à pied en soirée', 13030, 4380, 72),
  (uid, 'strava-seed', 'seed-2026-06-10-27', '2026-06-10'::date, 'Run', 'Retour à Paris', 9440, 3180, 60),
  (uid, 'strava-seed', 'seed-2026-06-12-28', '2026-06-12'::date, 'Run', 'Course à pied dans l''après-midi', 10020, 3360, 77),
  (uid, 'strava-seed', 'seed-2026-06-14-29', '2026-06-14'::date, 'Run', 'Hamster sur une piste de 200 m', 8270, 2760, 62),
  (uid, 'strava-seed', 'seed-2026-06-15-30', '2026-06-15'::date, 'Soccer', 'Football', 0, 5760, 99),
  (uid, 'strava-seed', 'seed-2026-06-16-31', '2026-06-16'::date, 'Run', 'Les 3 parcs du quartier', 15380, 5520, 61),
  (uid, 'strava-seed', 'seed-2026-06-18-32', '2026-06-18'::date, 'Run', 'Course à pied dans l''après-midi', 11230, 3960, 84),
  (uid, 'strava-seed', 'seed-2026-06-19-33', '2026-06-19'::date, 'Ride', '24 km indoor', 0, 2880, 15),
  (uid, 'strava-seed', 'seed-2026-06-20-34', '2026-06-20'::date, 'Run', 'Tempo progressif', 10020, 3300, 61),
  (uid, 'strava-seed', 'seed-2026-06-21-35', '2026-06-21'::date, 'Run', 'Allure 35 °C', 8370, 3120, 19),
  (uid, 'strava-seed', 'seed-2026-06-23-36', '2026-06-23'::date, 'Run', 'Course à pied en soirée', 10020, 3300, 38),
  (uid, 'strava-seed', 'seed-2026-06-24-37', '2026-06-24'::date, 'Weight', 'Entraînement aux poids', 0, 3780, 7),
  (uid, 'strava-seed', 'seed-2026-06-25-38', '2026-06-25'::date, 'Run', 'Pile à l''heure pour le déluge', 10010, 3300, 56),
  (uid, 'strava-seed', 'seed-2026-06-26-39', '2026-06-26'::date, 'Run', 'Course à pied dans l''après-midi', 8540, 2760, 68),
  (uid, 'strava-seed', 'seed-2026-06-27-40', '2026-06-27'::date, 'Run', 'Course à pied le matin', 6070, 2100, 19),
  (uid, 'strava-seed', 'seed-2026-06-28-41', '2026-06-28'::date, 'Run', 'Course à pied le matin', 11000, 3840, 68),
  (uid, 'strava-seed', 'seed-2026-06-30-42', '2026-06-30'::date, 'Run', 'Chaleur + départementales', 19260, 6780, 107),
  (uid, 'strava-seed', 'seed-2026-07-03-43', '2026-07-03'::date, 'Run', 'Course à pied en soirée', 7020, 2340, 37),
  (uid, 'strava-seed', 'seed-2026-07-03-44', '2026-07-03'::date, 'Weight', 'Entraînement aux poids', 0, 2880, 9),
  (uid, 'strava-seed', 'seed-2026-07-04-45', '2026-07-04'::date, 'Run', '6x800m à 4:20', 9520, 3000, 55),
  (uid, 'strava-seed', 'seed-2026-07-05-46', '2026-07-05'::date, 'Weight', 'Fentes bulgares sur TRX', 0, 3480, 11),
  (uid, 'strava-seed', 'seed-2026-07-07-47', '2026-07-07'::date, 'Run', 'Nouvel appart, nouveau parc', 6300, 2160, 47),
  (uid, 'strava-seed', 'seed-2026-07-08-48', '2026-07-08'::date, 'Run', 'Course à pied dans l''après-midi', 12810, 4680, 63),
  (uid, 'strava-seed', 'seed-2026-07-10-49', '2026-07-10'::date, 'Ride', 'Sortie vélo de nuit', 9940, 1980, 8),
  (uid, 'strava-seed', 'seed-2026-07-10-50', '2026-07-10'::date, 'Ride', 'Sortie vélo en soirée', 10120, 1920, 12),
  (uid, 'strava-seed', 'seed-2026-07-11-51', '2026-07-11'::date, 'Run', 'Fractionné de 1 km', 9510, 3060, 69),
  (uid, 'strava-seed', 'seed-2026-07-12-52', '2026-07-12'::date, 'Run', 'Course à pied en soirée', 11010, 3780, 61),
  (uid, 'strava-seed', 'seed-2026-07-14-53', '2026-07-14'::date, 'Run', 'Course à pied le midi', 7010, 2400, 30),
  (uid, 'strava-seed', 'seed-2026-07-16-54', '2026-07-16'::date, 'Run', 'Course à pied le midi', 7310, 2760, 18),
  (uid, 'strava-seed', 'seed-2026-07-18-55', '2026-07-18'::date, 'Hike', 'Vallée de Chevreuse', 23840, 19200, 26),
  (uid, 'strava-seed', 'seed-2026-07-19-56', '2026-07-19'::date, 'Run', 'Tempo 2x2km', 12020, 4200, 55),
  (uid, 'strava-seed', 'seed-2026-07-20-57', '2026-07-20'::date, 'Ride', 'Nouveau home trainer', 0, 3600, 8),
  (uid, 'strava-seed', 'seed-2026-07-21-58', '2026-07-21'::date, 'Run', 'Course à pied le midi', 7020, 2400, 26),
  (uid, 'strava-seed', 'seed-2026-07-23-59', '2026-07-23'::date, 'Run', '6x800m', 9510, 3060, 71),
  (uid, 'strava-seed', 'seed-2026-07-24-60', '2026-07-24'::date, 'Run', 'Mission failed', 11120, 3960, 41),
  (uid, 'strava-seed', 'seed-2026-07-25-61', '2026-07-25'::date, 'Ride', 'Home trainer', 0, 2760, 7),
  (uid, 'strava-seed', 'seed-2026-07-26-62', '2026-07-26'::date, 'Ride', 'Sortie vélo de nuit', 9970, 2460, 6),
  (uid, 'strava-seed', 'seed-2026-07-26-63', '2026-07-26'::date, 'Ride', 'Sortie vélo dans l''après-midi', 10060, 2220, 8),
  (uid, 'strava-seed', 'seed-2026-07-26-64', '2026-07-26'::date, 'Run', 'Course à pied le midi', 19020, 6540, 61),
  (uid, 'strava-seed', 'seed-2026-07-28-65', '2026-07-28'::date, 'Ride', 'Sortie vélo de nuit', 9600, 2040, 5),
  (uid, 'strava-seed', 'seed-2026-07-28-66', '2026-07-28'::date, 'Ride', 'Sortie vélo en soirée', 9340, 2280, 5),
  (uid, 'strava-seed', 'seed-2026-07-28-67', '2026-07-28'::date, 'Ride', 'Home trainer', 0, 2340, 5),
  (uid, 'strava-seed', 'seed-2026-07-28-68', '2026-07-28'::date, 'Weight', 'Entraînement aux poids', 0, 2400, 4),
  (uid, 'strava-seed', 'seed-2026-07-29-69', '2026-07-29'::date, 'Ride', 'Sortie vélo en soirée', 7420, 1920, 3),
  (uid, 'strava-seed', 'seed-2026-07-30-70', '2026-07-30'::date, 'Run', 'Balade dans Paris', 23020, 7860, 179),
  (uid, 'strava-seed', 'seed-2026-08-01-71', '2026-08-01'::date, 'Run', 'Fractionné 1 km', 9010, 2940, 67),
  (uid, 'strava-seed', 'seed-2026-08-02-72', '2026-08-02'::date, 'Run', 'Course à pied en soirée', 7100, 2520, 31),
  (uid, 'strava-seed', 'seed-2026-08-02-73', '2026-08-02'::date, 'Ride', 'Balade en famille', 28930, 9000, 15),
  (uid, 'strava-seed', 'seed-2026-08-03-74', '2026-08-03'::date, 'Ride', 'Sortie vélo dans l''après-midi', 0, 1800, 6),
  (uid, 'strava-seed', 'seed-2026-08-03-75', '2026-08-03'::date, 'Weight', 'Séance jambes + renfo course', 0, 2700, 5),
  (uid, 'strava-seed', 'seed-2026-08-05-76', '2026-08-05'::date, 'Weight', 'Renfo haut', 0, 1800, 4),
  (uid, 'strava-seed', 'seed-2026-08-06-77', '2026-08-06'::date, 'Ride', 'Sortie vélo le midi', 0, 3000, 8),
  (uid, 'strava-seed', 'seed-2026-08-07-78', '2026-08-07'::date, 'Run', 'Course à pied le matin', 10010, 3180, 42),
  (uid, 'strava-seed', 'seed-2026-08-08-79', '2026-08-08'::date, 'Run', 'Course à pied le midi', 3020, 1140, 10),
  (uid, 'strava-seed', 'seed-2026-08-08-80', '2026-08-08'::date, 'Run', 'Test aptitude 3000m', 3010, 720, 44),
  (uid, 'strava-seed', 'seed-2026-08-08-81', '2026-08-08'::date, 'Run', 'Course à pied le matin', 3400, 1140, 15),
  (uid, 'strava-seed', 'seed-2026-08-09-82', '2026-08-09'::date, 'Run', 'Balade à Vincennes', 25020, 8460, 96)
  on conflict (user_id, source, external_id) do nothing;

  raise notice 'Import terminé : % jours de carnet, % activités.',
    23, 83;
end $seed$;
