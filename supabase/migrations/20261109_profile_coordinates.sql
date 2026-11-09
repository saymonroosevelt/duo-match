-- =============================================================
-- Duo Match — coordenadas do perfil para distância (Haversine)
-- 1) Novos campos (nulos por padrão → opcional, não quebra nada)
-- 2) Índice para leitura pública eficiente de pontos geográficos
-- =============================================================

alter table public.profiles
  add column if not exists latitude double precision;

alter table public.profiles
  add column if not exists longitude double precision;

-- Sanidade: valores dentro de ranges válidos (ou nulos)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_latitude_range'
  ) then
    alter table public.profiles
      add constraint profiles_latitude_range
      check (latitude is null or (latitude >= -90 and latitude <= 90));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_longitude_range'
  ) then
    alter table public.profiles
      add constraint profiles_longitude_range
      check (longitude is null or (longitude >= -180 and longitude <= 180));
  end if;
end $$;

create index if not exists profiles_lat_lng_idx
  on public.profiles (latitude, longitude)
  where latitude is not null and longitude is not null;

-- As políticas RLS existentes em profiles já controlam quem lê/escreve a linha.
-- As colunas novas seguem as mesmas políticas da tabela.
