-- =============================================================
-- Duo Match — 2 contas admin: você e sua esposa
-- 1) is_admin() aceita as 2 contas
-- 2) trava enforce_single_admin() aceita as 2 (ninguém mais vira admin)
-- 3) Promove a sua conta a admin (approve se já existir)
-- =============================================================

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
      and lower(email) in (
        'marynamirandadirection@gmail.com',
        'symonrooseveelt@gmail.com'
      )
  );
$$;

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
     ) not in (
       'marynamirandadirection@gmail.com',
       'symonrooseveelt@gmail.com'
     ) then
    raise exception 'Admin restrito às contas do aplicativo.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_single_admin on public.profiles;
create trigger profiles_enforce_single_admin
  before insert or update of role on public.profiles
  for each row execute function public.enforce_single_admin();

-- Promove a sua conta a admin (a da sua esposa já é admin).
update public.profiles
set role = 'admin',
    status = 'approved'
where id = (
  select id from auth.users
  where lower(email) = 'symonrooseveelt@gmail.com'
);
