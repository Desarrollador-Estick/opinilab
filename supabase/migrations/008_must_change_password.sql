-- ============================================================
-- Migración 008: Contraseña temporal + cambio obligatorio en el
--                 primer acceso del portal de cliente
--
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- QUÉ HACE:
--   Al crear/convertir un cliente se le asigna una contraseña
--   temporal aleatoria y el flag `must_change_password = true`.
--   La primera vez que el cliente entra al portal es redirigido a
--   `/portal/cambiar-password` y NO puede usar el resto del portal
--   hasta que ponga una contraseña nueva (flag -> false).
--
-- NOTA: solo añade la columna. Los clientes que ya tenían cuenta
-- quedan con `false` (no se les fuerza el cambio retroactivamente).
-- ============================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;
