-- ============================================================
-- Migración: Token de pago público por factura
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: puedes ejecutarlo varias veces sin errores.
-- ============================================================

-- 1) Token único para el enlace público de pago de cada factura.
--    Solo quien tenga este token puede ver y pagar la factura.
alter table public.invoices
  add column if not exists payment_token text;

-- 2) Índice único para resolver rápido y sin colisiones.
create unique index if not exists idx_invoices_payment_token
  on public.invoices(payment_token) where payment_token is not null;

-- 3) Generador de token (UUID sin guiones) para asignarlo al emitir la factura.
create or replace function public.generate_payment_token()
returns text
language sql
as $$
  select replace(gen_random_uuid()::text, '-', '')
$$;
