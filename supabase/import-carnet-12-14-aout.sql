-- ════════════════════════════════════════════════════════════════════════════
--  Tenload — carnet du 12 au 14 août 2026
--
--  Le seed s'arrête au 11 août. Ces trois journées viennent de l'export Notion
--  du carnet de suivi et comblent le trou jusqu'au passage complet à l'app.
--  À jouer une fois dans l'éditeur SQL de Supabase.
--
--  Idempotent : `on conflict (user_id, day) do update` — le rejouer met à jour
--  les mêmes lignes au lieu d'en créer d'autres.
--
--  Deux valeurs sont volontairement NULL le 14 août : la douleur de fin de
--  journée et l'hydratation n'ont pas été saisies. Les mettre à zéro aurait
--  menti au modèle, qui distingue « mesuré à zéro » de « pas mesuré » — la
--  douleur du soir pèse 35 % du terme de douleur, une fausse valeur basse
--  aurait tiré l'indice vers le bas sans raison.
-- ════════════════════════════════════════════════════════════════════════════

do $import$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = 'mathieu.franzen1@gmail.com';
  if uid is null then
    raise exception 'Aucun compte mathieu.franzen1@gmail.com. Connecte-toi une fois à l''app avec cette adresse avant de lancer ce script.';
  end if;

  insert into public.daily_logs
    (user_id, day, pain_wake, pain_effort, pain_evening,
     eccentric, icing, jumps, hydration_l, mood, note)
  values
  -- Mercredi 12 août — EF 7 km. Glaçage et sauts faits.
  (uid, '2026-08-12'::date, 2, 1, 3, false, true, true, 1.5, '😅',
   '7km EF — Douleur genou gauche, cheville gauche'),

  -- Jeudi 13 août — Renfo bas + haut. Le renfo bas vaut le protocole
  -- excentrique, d'où eccentric = true : c'est lui qui donne le crédit de −6
  -- sur l'indice du lendemain.
  (uid, '2026-08-13'::date, 1, 0, 1, true, false, false, 1, '😒',
   'Stanish, soulève de terre unilatéral, pompes, biceps curl, abdos — Pliure des genoux évitées'),

  -- Vendredi 14 août — EF 7 km, douleur à l'effort à 3. Fin de journée et
  -- hydratation non saisies.
  (uid, '2026-08-14'::date, 2, 3, null, false, false, false, null, '😩',
   'Ef — Douleur genou gauche, douleur derrière genou droit, douleur dessus du pied droit, douleur tendon. Foulée modifiée, meilleures sensations après 5 km')

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

  -- FC max relevée à 185 le 23 août 2026. C'est `profiles.hr_max` qui fait foi
  -- dans l'app ; la constante de `paces.ts` n'est qu'un repli quand le profil
  -- n'est pas encore chargé. Changer la constante seule ne déplace donc pas
  -- les zones affichées.
  update public.profiles set hr_max = 185 where id = uid;
  if not found then
    raise exception 'Aucune ligne profiles pour ce compte. Ouvre l''app une fois, puis relance.';
  end if;

  raise notice 'Carnet complété (12 au 14 août 2026) et FC max portée à 185.';
end
$import$;
