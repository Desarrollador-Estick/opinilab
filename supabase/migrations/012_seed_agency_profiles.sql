-- ============================================================
-- Migración 012: Seed de perfiles de agencia (roles internos)
--
-- PROBLEMA: la tabla `profiles` estaba vacía en producción, por lo
-- que ningún usuario autenticado tenía rol de agencia. El middleware
-- (`src/lib/supabase/middleware.ts`) bloquea el acceso a /dashboard
-- cuando un usuario no tiene `role`, y `is_agency_role()` (RLS) devuelve
-- falso, ocultando todo el consumo de IA (`usage_logs`), clientes, etc.
--
-- SOLUCIÓN: sembrar un perfil `admin` para la cuenta de administrador
-- de la agencia. Idempotente: `on conflict (id) do nothing` evita
-- duplicados si ya se aplicó manualmente.
--
-- IMPORTANTE: ajusta el `id` (user id de Supabase Auth) y el `email`
-- a la cuenta real del administrador de la agencia antes de ejecutar.
-- ============================================================

insert into public.profiles (id, email, full_name, role)
values
  ('7fb688ca-5c2b-45b8-b0b1-a1f1be36e2a5', 'admin-test@opinilab.com', 'Admin Test', 'admin')
on conflict (id) do nothing;
