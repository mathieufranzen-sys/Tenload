-- ════════════════════════════════════════════════════════════════════════════
--  Tenload — rappels du carnet
--
--  À exécuter une fois, en entier, dans l'éditeur SQL de Supabase, APRÈS
--  schema.sql. Idempotent : rejouable tel quel.
--
--  Deux rappels, tous deux en heure de Paris :
--    08 h 00  raideur au réveil
--    23 h 00  fin de journée, plus le ressenti de séance s'il manque
--
--  Le cron tourne toutes les heures et non deux fois par jour, parce que
--  pg_cron raisonne en UTC : à heure fixe, le rappel de 8 h glisserait d'une
--  heure deux fois par an. C'est la fonction qui lit l'heure de Paris et
--  décide si c'est le moment. Vingt-deux réveils inutiles par jour coûtent
--  moins cher qu'un rappel à 7 h en hiver.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Abonnements push ───────────────────────────────────────────────────────
-- Un appareil = une ligne. L'endpoint est la clé : c'est lui que le service de
-- push du navigateur fournit, et lui qui devient invalide au désabonnement.
create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Même patron que les autres tables : chacun ne voit et n'écrit que ses lignes.
-- L'Edge Function, elle, utilise la clé de service et passe outre la RLS.
drop policy if exists "push lecture" on public.push_subscriptions;
create policy "push lecture"
  on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push insertion" on public.push_subscriptions;
create policy "push insertion"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push mise a jour" on public.push_subscriptions;
create policy "push mise a jour"
  on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "push suppression" on public.push_subscriptions;
create policy "push suppression"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists pg_cron  with schema extensions;
create extension if not exists pg_net   with schema extensions;

-- ─── Le réveil horaire ──────────────────────────────────────────────────────
--
--  ⚠️  DEUX VALEURS À REMPLACER AVANT DE LANCER, et à ne jamais committer :
--      <PROJET>   la référence du projet, dans l'URL du tableau de bord
--      <CLE>      la clé service_role, Project Settings > API
--
--  La clé service_role donne un accès total à la base. Elle ne sort pas de
--  cette fenêtre : ce fichier est versionné, le script exécuté ne l'est pas.
do $rappels$
begin
  perform cron.unschedule('tenload-rappels');
exception when others then
  -- Le premier passage n'a rien à décrocher.
  null;
end
$rappels$;

select cron.schedule(
  'tenload-rappels',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJET>.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <CLE>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Vérification : la tâche doit apparaître, active, toutes les heures.
select jobid, schedule, jobname, active from cron.job where jobname = 'tenload-rappels';
