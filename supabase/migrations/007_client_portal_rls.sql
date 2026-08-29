-- ============================================================
-- Migración 007: Portal de cliente — perfiles vinculados a clientes
--                 + RLS por fila (cliente ve solo sus datos)
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- QUÉ HACE:
--  1. Añade la columna `client_id` a `profiles` para vincular una
--     cuenta de usuario con su ficha en `clients`.
--  2. Sustituye las políticas RLS "Auth full access" (que daban acceso
--     TOTAL a CUALQUIER usuario autenticado) por políticas por rol:
--       - Roles de agencia (admin, manager, member) → acceso total
--         (igual que antes, porque la app interna usa estos roles).
--       - Rol `client` → SOLO a sus propias filas, vía client_id.
--  NOTA: la futura página /register ya NO debe crear admins; el admin
--  crea las cuentas de cliente desde el panel (rol 'client' + client_id).
--
-- IMPORTANTE: asegúrate de que tu usuario actual en `profiles` tenga
-- `role` en ('admin','manager','member') o perderás el acceso a las
-- tablas internas. Por defecto el registro antiguo creaba 'admin'.
-- ============================================================

-- 1) Columna de vínculo usuario <-> cliente (idempotente).
alter table public.profiles
  add column if not exists client_id uuid references public.clients on delete set null;

create index if not exists idx_profiles_client_id on public.profiles(client_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- 2) Helper: client_id del cliente del usuario autenticado (null si es agencia).
create or replace function public.current_user_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()
$$;

-- 3) Helper: ¿el usuario autenticado es rol de agencia?
create or replace function public.is_agency_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select role in ('admin', 'manager', 'member')
  from public.profiles
  where id = auth.uid()
$$;

-- 4) Borrar todas las políticas anteriores (idempotente).
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and policyname in ('Admin full access', 'Auth full access')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 5) Políticas nuevas por rol.

-- --- profiles ---
-- La agencia puede gestionar perfiles; un cliente solo ve su propio perfil.
drop policy if exists "Agency manage profiles" on public.profiles;
create policy "Agency manage profiles" on public.profiles
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own profile" on public.profiles;
create policy "Client read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- --- clients ---
drop policy if exists "Agency full access clients" on public.clients;
create policy "Agency full access clients" on public.clients
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own client" on public.clients;
create policy "Client read own client" on public.clients
  for select to authenticated
  using (id = current_user_client_id());

-- --- services (catálogo; la agencia lo gestiona, el cliente lo lee) ---
drop policy if exists "Agency full access services" on public.services;
create policy "Agency full access services" on public.services
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

-- --- client_services ---
drop policy if exists "Agency full access client_services" on public.client_services;
create policy "Agency full access client_services" on public.client_services
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own client_services" on public.client_services;
create policy "Client read own client_services" on public.client_services
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- contracts ---
drop policy if exists "Agency full access contracts" on public.contracts;
create policy "Agency full access contracts" on public.contracts
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own contracts" on public.contracts;
create policy "Client read own contracts" on public.contracts
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- invoices ---
drop policy if exists "Agency full access invoices" on public.invoices;
create policy "Agency full access invoices" on public.invoices
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own invoices" on public.invoices;
create policy "Client read own invoices" on public.invoices
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- invoice_items ---
drop policy if exists "Agency full access invoice_items" on public.invoice_items;
create policy "Agency full access invoice_items" on public.invoice_items
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own invoice_items" on public.invoice_items;
create policy "Client read own invoice_items" on public.invoice_items
  for select to authenticated
  using (exists (
    select 1 from public.invoices inv
    where inv.id = invoice_items.invoice_id
      and inv.client_id = current_user_client_id()
  ));

-- --- payments ---
drop policy if exists "Agency full access payments" on public.payments;
create policy "Agency full access payments" on public.payments
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own payments" on public.payments;
create policy "Client read own payments" on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.invoices inv
    where inv.id = payments.invoice_id
      and inv.client_id = current_user_client_id()
  ));

-- --- reviews ---
drop policy if exists "Agency full access reviews" on public.reviews;
create policy "Agency full access reviews" on public.reviews
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own reviews" on public.reviews;
create policy "Client read own reviews" on public.reviews
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- review_requests ---
drop policy if exists "Agency full access review_requests" on public.review_requests;
create policy "Agency full access review_requests" on public.review_requests
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own review_requests" on public.review_requests;
create policy "Client read own review_requests" on public.review_requests
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- reports ---
drop policy if exists "Agency full access reports" on public.reports;
create policy "Agency full access reports" on public.reports
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own reports" on public.reports;
create policy "Client read own reports" on public.reports
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- tasks (el cliente puede ver las tareas de su cuenta) ---
drop policy if exists "Agency full access tasks" on public.tasks;
create policy "Agency full access tasks" on public.tasks
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Client read own tasks" on public.tasks;
create policy "Client read own tasks" on public.tasks
  for select to authenticated
  using (client_id = current_user_client_id());

-- --- social_accounts / social_posts / seo_audits (solo agencia) ---
drop policy if exists "Agency full access social_accounts" on public.social_accounts;
create policy "Agency full access social_accounts" on public.social_accounts
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access social_posts" on public.social_posts;
create policy "Agency full access social_posts" on public.social_posts
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access seo_audits" on public.seo_audits;
create policy "Agency full access seo_audits" on public.seo_audits
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

-- --- leads / email_templates / email_sends / lead_status_changes / automation_logs / settings (solo agencia) ---
drop policy if exists "Agency full access leads" on public.leads;
create policy "Agency full access leads" on public.leads
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access email_templates" on public.email_templates;
create policy "Agency full access email_templates" on public.email_templates
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access email_sends" on public.email_sends;
create policy "Agency full access email_sends" on public.email_sends
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access lead_status_changes" on public.lead_status_changes;
create policy "Agency full access lead_status_changes" on public.lead_status_changes
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access automation_logs" on public.automation_logs;
create policy "Agency full access automation_logs" on public.automation_logs
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());

drop policy if exists "Agency full access settings" on public.settings;
create policy "Agency full access settings" on public.settings
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());
