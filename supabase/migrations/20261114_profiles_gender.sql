-- =============================================================
-- Duo Match — Gênero do perfil e filtro "O que você deseja ver?"
-- Rode no Supabase: https://supabase.com/dashboard → SQL Editor
-- (o app funciona sem esta coluna, mas o gênero e a filtragem
--  só são ativados depois que ela existir)
-- =============================================================

alter table public.profiles
  add column if not exists gender text;

comment on column public.profiles.gender is
  'Gênero do perfil: male | female (nulo = ainda não informado)';

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female'));

create index if not exists profiles_gender_idx on public.profiles (gender);

-- Opcional: marcar a preferência de visualização já existente como visível
-- (a coluna preferred_gender já existe; nenhuma ação de dados é necessária).
comment on column public.profiles.preferred_gender is
  'O que a pessoa deseja ver no Explorar: male | female | all (nulo = todos)';
