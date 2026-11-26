-- Privacidade de localização: qualquer usuária logada pode ler o perfil
-- aprovado de outra pessoa, incluindo latitude/longitude. Com 3 casas
-- decimais (~110 m) dá para achar o quarteirão da casa de alguém.
-- Aqui o banco arredonda sempre para 2 casas (~1,1 km), o suficiente
-- para "A X km de você" e sem expor o endereço — mesmo que alguém
-- burle o app e envie coordenadas exatas direto para a API.

create or replace function public.round_profile_coordinates()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null then
    new.latitude := round(new.latitude::numeric, 2)::double precision;
  end if;
  if new.longitude is not null then
    new.longitude := round(new.longitude::numeric, 2)::double precision;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_round_coordinates on public.profiles;
create trigger profiles_round_coordinates
before insert or update of latitude, longitude on public.profiles
for each row execute function public.round_profile_coordinates();

-- Arredonda o que já está salvo.
update public.profiles
set latitude = round(latitude::numeric, 2)::double precision,
    longitude = round(longitude::numeric, 2)::double precision
where latitude is not null or longitude is not null;
