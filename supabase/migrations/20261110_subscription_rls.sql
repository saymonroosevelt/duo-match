-- =============================================================
-- Duo Match — RLS dura: vantagens exigem assinatura ativa
-- Regra: páginas/dados de vantangem (perfis de terceiros, matches,
-- mensagens) só para quem tem subscriptions.status IN ('active','trialing')
-- ou para a única conta admin (marynamirandadirection@gmail.com).
-- O próprio perfil e a própria linha continuam sempre acessíveis.
-- =============================================================

-- 1) Helper: usuário tem assinatura ativa? (security definer → lê o boolean sem depender de RLS)
create or replace function public.has_active_subscription(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id = p_user
      and status in ('active', 'trialing')
  );
$$;

-- 2) PROFILES — ver perfis só assinante/admin; o próprio continua aberto
drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles for select to authenticated
using (
  auth.uid() = id
  or public.is_admin()
  or (status = 'approved' and public.has_active_subscription(auth.uid()))
);

-- 3) MATCHES — só assinante/admin vê, curte, aceita ou recusa
drop policy if exists "matches_select_participant" on public.matches;
create policy "matches_select_participant"
on public.matches for select to authenticated
using (
  public.is_admin()
  or (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and public.has_active_subscription(auth.uid())
  )
);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own"
on public.matches for insert to authenticated
with check (
  public.is_admin()
  or (
    auth.uid() = sender_id
    and sender_id <> receiver_id
    and status in ('pending', 'rejected')
    and public.has_active_subscription(auth.uid())
  )
);

drop policy if exists "matches_update_participant" on public.matches;
create policy "matches_update_participant"
on public.matches for update to authenticated
using (
  public.is_admin()
  or (
    (auth.uid() = sender_id or auth.uid() = receiver_id)
    and public.has_active_subscription(auth.uid())
  )
)
with check (
  public.is_admin()
  or (auth.uid() = receiver_id and status in ('matched', 'rejected') and public.has_active_subscription(auth.uid()))
  or (auth.uid() = sender_id and status = 'rejected' and public.has_active_subscription(auth.uid()))
);

-- 4) MESSAGES — participantes + assinatura ativa; admin vê tudo
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
on public.messages for select to authenticated
using (
  public.is_admin()
  or (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.sender_id or auth.uid() = m.receiver_id)
    )
    and public.has_active_subscription(auth.uid())
  )
);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
on public.messages for insert to authenticated
with check (
  public.is_admin()
  or (
    sender_id = auth.uid()
    and public.has_active_subscription(auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and m.status = 'matched'
        and (auth.uid() = m.sender_id or auth.uid() = m.receiver_id)
        and not public.is_blocked(m.sender_id, m.receiver_id)
    )
  )
);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
on public.messages for delete to authenticated
using (
  public.is_admin()
  or (sender_id = auth.uid() and public.has_active_subscription(auth.uid()))
);
