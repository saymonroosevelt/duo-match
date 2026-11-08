-- ============================================================
-- DUO MATCH — CONSOLIDAÇÃO DO BRIEFING
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Pode ser executado mais de uma vez (é idempotente).
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. PROFILES
-- ============================================================
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists lgpd_accepted_at timestamptz;
alter table public.profiles add column if not exists last_active timestamptz default now();
alter table public.profiles add column if not exists is_verified boolean default false;
alter table public.profiles add column if not exists preferences jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists preferred_gender text;
alter table public.profiles add column if not exists min_age integer default 18;
alter table public.profiles add column if not exists max_age integer default 99;

-- values_inegotiable foi criada como TEXT; converte para TEXT[] com segurança.
do $$
declare tipo text;
begin
  select data_type into tipo
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'values_inegotiable';

  if tipo is null then
    alter table public.profiles add column values_inegotiable text[];
  elsif tipo <> 'ARRAY' then
    alter table public.profiles
      alter column values_inegotiable type text[]
      using case
        when values_inegotiable is null then null
        else string_to_array(values_inegotiable, ',')
      end;
  end if;
end $$;

-- intentions já é TEXT[]; garante a coluna caso o banco esteja antigo.
do $$
declare tipo text;
begin
  select data_type into tipo
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'intentions';

  if tipo is null then
    alter table public.profiles add column intentions text[];
  elsif tipo <> 'ARRAY' then
    alter table public.profiles
      alter column intentions type text[]
      using case
        when intentions is null then null
        else array[intentions]
      end;
  end if;
end $$;

update public.profiles set status = 'pending' where status is null;
update public.profiles set role = 'user' where role is null;
alter table public.profiles alter column status set default 'pending';
alter table public.profiles alter column role set default 'user';

create index if not exists profiles_status_idx on public.profiles (status);
create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ============================================================
-- 2. FUNÇÕES E TRIGGERS AUXILIARES
-- ============================================================

-- Definida cedo porque os triggers abaixo dependem dela.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- Impede que o próprio usuário mude status ou cargo.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     or public.is_admin() then
    return new;
  end if;

  new.id := old.id;
  new.role := old.role;
  new.status := old.status;
  new.is_verified := old.is_verified;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ============================================================
-- 3. PLANOS
-- ============================================================
alter table public.plans add column if not exists slug text;
alter table public.plans add column if not exists description text;
alter table public.plans add column if not exists interval text default 'month';
alter table public.plans add column if not exists highlight boolean default false;
alter table public.plans add column if not exists active boolean default true;
alter table public.plans add column if not exists created_at timestamptz default now();

create unique index if not exists plans_slug_unique on public.plans (slug);

update public.plans
set slug = 'duo-match'
where slug is null and lower(trim(name)) = 'duo match';

update public.plans
set slug = 'duo-select'
where slug is null and lower(trim(name)) like 'duo select%';

-- Planos antigos que não fazem parte do briefing ficam ocultos.
update public.plans set active = false where slug is null;

insert into public.plans (name, price, features, slug, description, interval, highlight, active)
values
  (
    'Duo Match',
    49.90,
    '["Curadoria de perfis","Matches e chat ilimitados","Filtros de busca","Comunidades de interesse"]'::jsonb,
    'duo-match',
    'Para quem quer conhecer pessoas com intenções reais, com curadoria e conversas sem ruído.',
    'month',
    false,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  price = excluded.price,
  features = excluded.features,
  description = excluded.description,
  interval = excluded.interval,
  highlight = excluded.highlight,
  active = excluded.active;

-- O plano Duo Select saiu do catálogo: fica oculto.
update public.plans
set active = false
where slug = 'duo-select';

-- ============================================================
-- 4. ASSINATURAS
-- ============================================================
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists expires_at timestamptz;
alter table public.subscriptions add column if not exists created_at timestamptz default now();
alter table public.subscriptions add column if not exists updated_at timestamptz default now();
alter table public.subscriptions add column if not exists gateway text;
alter table public.subscriptions add column if not exists gateway_subscription_id text;

update public.subscriptions set status = 'pending_payment' where status is null;
alter table public.subscriptions alter column status set default 'pending_payment';

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

-- O usuário pode trocar de plano enquanto o pagamento não foi confirmado,
-- mas nunca pode ativar a assinatura sozinho.
create or replace function public.protect_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     or public.is_admin() then
    return new;
  end if;

  new.user_id := old.user_id;
  new.status := old.status;
  new.gateway := old.gateway;
  new.gateway_subscription_id := old.gateway_subscription_id;
  return new;
end;
$$;

drop trigger if exists subscriptions_protect_fields on public.subscriptions;
create trigger subscriptions_protect_fields
before update on public.subscriptions
for each row execute function public.protect_subscription_fields();

-- ============================================================
-- 5. MATCHES
-- ============================================================
alter table public.matches add column if not exists created_at timestamptz default now();
alter table public.matches add column if not exists updated_at timestamptz default now();

-- A tabela antiga só aceitava pending/matched. Libera também rejected (passar).
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.matches drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.matches
  add constraint matches_status_check
  check (status in ('pending', 'matched', 'rejected'));

create index if not exists matches_sender_idx on public.matches (sender_id);
create index if not exists matches_receiver_idx on public.matches (receiver_id);
create index if not exists matches_status_idx on public.matches (status);

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

-- Protege os participantes e impede transformar uma recusa em match.
create or replace function public.protect_match_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     or public.is_admin() then
    return new;
  end if;

  if old.status = 'rejected' then
    raise exception 'Uma recusa não pode ser alterada.';
  end if;

  new.sender_id := old.sender_id;
  new.receiver_id := old.receiver_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists matches_protect_fields on public.matches;
create trigger matches_protect_fields
before update on public.matches
for each row execute function public.protect_match_fields();

-- ============================================================
-- 6. MENSAGENS
-- ============================================================
alter table public.messages add column if not exists read_at timestamptz;
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- Realtime para o chat
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- ============================================================
-- 7. DENÚNCIAS E BLOQUEIOS
-- ============================================================
create table if not exists public.reports (
  id bigint generated by default as identity primary key,
  reporter_id uuid references public.profiles(id) on delete cascade,
  reported_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create index if not exists reports_reported_idx on public.reports (reported_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ============================================================
-- 8. FUNÇÕES DE APOIO
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = user_a and blocked_id = user_b)
       or (blocker_id = user_b and blocked_id = user_a)
  );
$$;

-- Cria o perfil automaticamente no cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, status, role, lgpd_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'pending',
    'user',
    case
      when new.raw_user_meta_data->>'lgpd_accepted_at' is not null
        then (new.raw_user_meta_data->>'lgpd_accepted_at')::timestamptz
      else now()
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Permite que o titular exclua a própria conta (LGPD).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- 9. RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- Remove todas as políticas antigas das tabelas gerenciadas e recria um conjunto completo.
do $$
declare p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','plans','subscriptions','matches','messages','reports','blocks')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Perfis
create policy "profiles_select_visible"
on public.profiles for select to authenticated
using (auth.uid() = id or status = 'approved' or public.is_admin());

create policy "profiles_insert_self"
on public.profiles for insert to authenticated
with check (auth.uid() = id and status = 'pending' and role = 'user');

create policy "profiles_update_self_or_admin"
on public.profiles for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "profiles_delete_self_or_admin"
on public.profiles for delete to authenticated
using (auth.uid() = id or public.is_admin());

-- Planos (catálogo público; só admin escreve)
create policy "plans_select_public"
on public.plans for select to anon, authenticated
using (true);

create policy "plans_admin_write"
on public.plans for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Assinaturas
create policy "subscriptions_select_own"
on public.subscriptions for select to authenticated
using (auth.uid() = user_id or public.is_admin());

create policy "subscriptions_insert_own_pending"
on public.subscriptions for insert to authenticated
with check (auth.uid() = user_id and status = 'pending_payment');

create policy "subscriptions_update_own_pending"
on public.subscriptions for update to authenticated
using (auth.uid() = user_id and status = 'pending_payment')
with check (auth.uid() = user_id and status = 'pending_payment');

create policy "subscriptions_admin_all"
on public.subscriptions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Matches
create policy "matches_select_participant"
on public.matches for select to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin());

create policy "matches_insert_own"
on public.matches for insert to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> receiver_id
  and status in ('pending', 'rejected')
);

-- Regra de segurança:
-- - quem recebeu a curtida pode aceitar (matched) ou recusar (rejected);
-- - quem enviou pode cancelar a própria curtida (rejected);
-- - ninguém pode forçar um match sozinho.
create policy "matches_update_participant"
on public.matches for update to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin())
with check (
  public.is_admin()
  or (auth.uid() = receiver_id and status in ('matched', 'rejected'))
  or (auth.uid() = sender_id and status = 'rejected')
);

-- Mensagens
create policy "messages_select_participant"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (auth.uid() = m.sender_id or auth.uid() = m.receiver_id)
  )
);

create policy "messages_insert_own"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and m.status = 'matched'
      and (auth.uid() = m.sender_id or auth.uid() = m.receiver_id)
      and not public.is_blocked(m.sender_id, m.receiver_id)
  )
);

create policy "messages_delete_own"
on public.messages for delete to authenticated
using (sender_id = auth.uid());

-- Denúncias
create policy "reports_insert_own"
on public.reports for insert to authenticated
with check (reporter_id = auth.uid() and reporter_id <> reported_id);

create policy "reports_select_own_or_admin"
on public.reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_admin_update"
on public.reports for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Bloqueios
create policy "blocks_select_own"
on public.blocks for select to authenticated
using (
  blocker_id = auth.uid()
  or blocked_id = auth.uid()
  or public.is_admin()
);

create policy "blocks_insert_own"
on public.blocks for insert to authenticated
with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

create policy "blocks_delete_own"
on public.blocks for delete to authenticated
using (blocker_id = auth.uid());

-- ============================================================
-- 10. STORAGE DE FOTOS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Duo avatars public read" on storage.objects;
create policy "Duo avatars public read"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Duo avatars user insert" on storage.objects;
create policy "Duo avatars user insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Duo avatars user update" on storage.objects;
create policy "Duo avatars user update"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Duo avatars user delete" on storage.objects;
create policy "Duo avatars user delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
