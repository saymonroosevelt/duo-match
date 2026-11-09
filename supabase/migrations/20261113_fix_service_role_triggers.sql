-- =============================================================
-- Duo Match — corrige a detecção de service_role nos triggers
-- =============================================================
-- O PostgREST novo não preenche mais o GUC legado
-- request.jwt.claim.role; ele expõe os claims em request.jwt.claims.
-- Com isso, os triggers de proteção não reconheciam a service_role e
-- revertiam silenciosamente o status da assinatura para pending_payment
-- mesmo depois do webhook da Kiwify confirmar o pagamento.
--
-- Esta migration:
--   1) cria public.is_service_role() lendo os dois formatos
--   2) reaplica os triggers de profiles, subscriptions e matches
-- =============================================================

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    nullif(current_setting('role', true), ''),
    ''
  ) = 'service_role';
$$;

-- 1) Perfis: status, cargo e verificação só mudam por admin/service_role.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin() then
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

-- 2) Assinaturas: o cliente nunca ativa/cancela sozinho; o webhook sim.
create or replace function public.protect_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin() then
    return new;
  end if;

  new.user_id := old.user_id;
  new.status := old.status;
  new.gateway := old.gateway;
  new.gateway_subscription_id := old.gateway_subscription_id;
  return new;
end;
$$;

-- 3) Matches: participantes e created_at são imutáveis para o cliente.
create or replace function public.protect_match_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_role() or public.is_admin() then
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

-- Garante que a API enxergue as funções atualizadas.
notify pgrst, 'reload schema';
