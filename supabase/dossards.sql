-- ════════════════════════════════════════════════════════════════════════════
--  Tendo — les dossards (écran Objectif)
--
--  À exécuter une fois dans l'éditeur SQL de Supabase, APRÈS schema.sql.
--  Tableau de bord > SQL Editor > New query > coller > Run. Idempotent : le
--  relancer ne casse rien.
--
--  Une ligne par dossard. Deux sortes de lignes, reconnaissables à leur id :
--  - `plan-<semaine>-<jour>-<rang>` : un dossard du plan de référence (20 km
--    de Paris, 10 km Hoka, semi test, marathon). La ligne n'existe que pour
--    porter l'objectif chrono. Son chrono réel, lui, reste dans
--    plan_overrides (durée réelle de la course) : une seule source par valeur.
--  - tout autre id (généré par l'app) : un dossard ajouté à la main. Il ne
--    touche ni au plan ni à la charge du tendon.
--
--  Une suppression est un drapeau, pas un DELETE : toutes les écritures de
--  l'app sont des upserts, rejouables telles quelles par la file d'attente
--  hors ligne. Un DELETE ne se rejoue pas sans risque.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.dossards (
  user_id      uuid not null references auth.users on delete cascade,
  id           text not null,
  nom          text not null,
  day          date not null,
  distance_km  numeric(6, 3) not null check (distance_km > 0 and distance_km <= 250),
  -- Objectif chrono, en secondes. Null tant qu'il n'est pas fixé.
  objectif_s   integer check (objectif_s is null or objectif_s > 0),
  -- Chrono réalisé, en secondes. Toujours null pour un dossard du plan.
  chrono_s     integer check (chrono_s is null or chrono_s > 0),
  supprime     boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.dossards enable row level security;

drop policy if exists "dossards lecture" on public.dossards;
create policy "dossards lecture"
  on public.dossards for select using (auth.uid() = user_id);
drop policy if exists "dossards insertion" on public.dossards;
create policy "dossards insertion"
  on public.dossards for insert with check (auth.uid() = user_id);
drop policy if exists "dossards modification" on public.dossards;
create policy "dossards modification"
  on public.dossards for update using (auth.uid() = user_id);
