-- ════════════════════════════════════════════════════════════════════════════
--  Tendo — le suivi du renforcement (charge et répétitions)
--
--  À exécuter une fois dans l'éditeur SQL de Supabase, APRÈS schema.sql.
--  Tableau de bord > SQL Editor > New query > coller > Run. Idempotent : le
--  relancer ne casse rien.
--
--  Une ligne par exercice et par jour, les deux jambes ensemble. `exercice`
--  est l'identifiant du catalogue de `src/lib/renfo.ts` (« mollet-tendu »),
--  jamais le nom du plan, qui varie d'une semaine à l'autre.
--
--  Retirer une saisie, c'est écrire `series = 0`, pas un DELETE : toutes les
--  écritures de l'app sont des upserts, rejouables par la file hors ligne.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.renfo_series (
  user_id     uuid not null references auth.users on delete cascade,
  day         date not null,
  exercice    text not null,
  series      smallint not null check (series between 0 and 20),
  -- Répétitions, secondes ou contacts, selon l'exercice.
  valeur      smallint not null check (valeur between 0 and 1000),
  -- Charge ajoutée, haltère et sac ensemble. Zéro : poids du corps.
  kg          numeric(5, 1) not null default 0 check (kg >= 0 and kg <= 500),
  marge       text check (marge is null or marge in ('facile', 'juste', 'limite')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, day, exercice)
);

alter table public.renfo_series enable row level security;

drop policy if exists "renfo lecture" on public.renfo_series;
create policy "renfo lecture"
  on public.renfo_series for select using (auth.uid() = user_id);
drop policy if exists "renfo insertion" on public.renfo_series;
create policy "renfo insertion"
  on public.renfo_series for insert with check (auth.uid() = user_id);
drop policy if exists "renfo modification" on public.renfo_series;
create policy "renfo modification"
  on public.renfo_series for update using (auth.uid() = user_id);
