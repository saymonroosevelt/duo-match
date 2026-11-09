-- =============================================================
-- Duo Match — checkout_email para casar o comprador Kiwify ↔ usuário
-- =============================================================

alter table public.subscriptions
  add column if not exists checkout_email text;

create index if not exists subscriptions_checkout_email_idx
  on public.subscriptions (lower(checkout_email));
