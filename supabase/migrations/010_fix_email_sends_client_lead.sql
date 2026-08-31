-- ============================================================
-- FIX PRODUCCIÓN: añadir columnas que usa sendEmail (send.ts)
-- a la tabla email_sends.
--
-- PROBLEMA: en producción, email_sends NO tiene las columnas
-- client_id ni lead_id. sendEmail (src/lib/email/send.ts) las
-- inserta, por lo que cada envío falla con PGRST204 y el
-- catch{} silencioso traga el error -> la tabla queda vacía.
--
-- Ejecuta TODO este script en:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
-- ============================================================

alter table public.email_sends
  add column if not exists client_id uuid references public.clients on delete set null;
alter table public.email_sends
  add column if not exists lead_id uuid references public.leads on delete set null;
