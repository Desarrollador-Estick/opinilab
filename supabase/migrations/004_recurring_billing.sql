-- ============================================================
-- Migración: Facturación mensual recurrente (cobros automáticos)
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: puedes ejecutarlo varias veces sin errores.
-- ============================================================

-- 1) Guardar el método de pago por defecto del cliente en Stripe
--    (necesario para los cobros automáticos del día 1 de cada mes)
alter table public.clients
  add column if not exists stripe_default_payment_method_id text;

-- 2) Índice para localizar rápido el método de pago por defecto
create index if not exists idx_clients_stripe_pm
  on public.clients(stripe_default_payment_method_id);

-- 3) Guardar la columna del PaymentIntent en facturas cobradas por débito directo
--    (ya existe stripe_payment_intent_id de la migración 002; la mantenemos).

-- Nota: la automatización del "día 1" se ejecuta desde el backend (endpoint
-- /api/invoices/run-monthly), invocable mediante cron (Vercel/Supabase/GitHub
-- Actions). Este SQL solo almacena los datos; no contiene triggers de cron.
