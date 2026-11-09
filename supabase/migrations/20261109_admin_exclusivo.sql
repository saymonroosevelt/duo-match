-- =============================================================
-- Duo Match — Admin exclusivo (apenas a esposa) + trava de slip
-- 1) is_admin() passa a valer SOMENTE para o e-mail dela
-- 2) Trigger: ninguém mais pode VIRAR admin (ela continua sendo)
-- 3) (Opcional) Rebaixa os outros admins atuais para 'user'
-- =============================================================

-- 1) Admin = somente a conta dela
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) = 'marynamirandadirection@gmail.com'
  );
$$;

-- 2) Trigger de trava: impede qualquer outra conta de VIRA admin,
--    inclusive via service_role acidental ou SQL direto sem cuidado.
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin'
     and (tg_op = 'INSERT' or old.role is distinct from 'admin')
     and (
       select lower(email)
       from auth.users
       where id = new.id
     ) <> 'marynamirandadirection@gmail.com' then
    raise exception 'Admin restrito a uma única conta do aplicativo.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_single_admin on public.profiles;
create trigger profiles_enforce_single_admin
  before insert or update of role on public.profiles
  for each row execute function public.enforce_single_admin();

-- 3) OPCIONAL — rebaixa outros admins atuais (o "teste" vira user).
--    O pedido foi: apenas a conta dela pode ser admin.
--    Se você quiser manter outra conta, APAGUE esta expressão antes de rodar:
update public.profiles
set role = 'user'
where role = 'admin'
  and id <> (
    select id from auth.users
    where lower(email) = 'marynamirandadirection@gmail.com'
  );
