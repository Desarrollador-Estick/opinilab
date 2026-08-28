-- ============================================================
-- Migración: Integración Stripe (pagos embebidos)
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: puedes ejecutarlo varias veces sin errores.
-- ============================================================

-- 1) Guardar el ID de cliente en Stripe (para cobros recurrentes/facturas)
alter table public.clients
  add column if not exists stripe_customer_id text;

-- 2) Guardar el PaymentIntent de Stripe asociado a una factura
alter table public.invoices
  add column if not exists stripe_payment_intent_id text;

-- 3) Método de pago concreto usado en Stripe (card, etc.)
alter table public.invoices
  add column if not exists stripe_payment_method text;

-- 4) Índices para consultas rápidas
create index if not exists idx_clients_stripe_customer
  on public.clients(stripe_customer_id);
create index if not exists idx_invoices_stripe_pi
  on public.invoices(stripe_payment_intent_id);
