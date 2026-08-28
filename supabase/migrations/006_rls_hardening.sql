-- ============================================================
-- Migración 006: Endurecer RLS de todas las tablas
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- ANTES:  las políticas eran "for all using (true)" → cualquier persona con
--         la clave anon/publishable (que viaja en el navegador) podía leer y
--         escribir TODAS las tablas (clientes, facturas, pagos, leads...).
--
-- DESPUÉS: solo los usuarios autenticados (rol `authenticated`) acceden por
--          RLS. Las escrituras de servidor a servidor (webhooks Stripe,
--          formulario público, cron) usan la clave service role que omite RLS.
-- ============================================================

-- 1) Dropear TODAS las políticas antiguas (idempotente).
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

-- 2) Crear políticas SOLO para el rol authenticated (idempotente).
create policy "Admin full access" on public.profiles
  for all to authenticated
  using (role = 'admin');

create policy "Auth full access" on public.clients
  for all to authenticated using (true);
create policy "Auth full access" on public.services
  for all to authenticated using (true);
create policy "Auth full access" on public.client_services
  for all to authenticated using (true);
create policy "Auth full access" on public.contracts
  for all to authenticated using (true);
create policy "Auth full access" on public.invoices
  for all to authenticated using (true);
create policy "Auth full access" on public.invoice_items
  for all to authenticated using (true);
create policy "Auth full access" on public.payments
  for all to authenticated using (true);
create policy "Auth full access" on public.reviews
  for all to authenticated using (true);
create policy "Auth full access" on public.review_requests
  for all to authenticated using (true);
create policy "Auth full access" on public.social_accounts
  for all to authenticated using (true);
create policy "Auth full access" on public.social_posts
  for all to authenticated using (true);
create policy "Auth full access" on public.seo_audits
  for all to authenticated using (true);
create policy "Auth full access" on public.leads
  for all to authenticated using (true);
create policy "Auth full access" on public.email_templates
  for all to authenticated using (true);
create policy "Auth full access" on public.email_sends
  for all to authenticated using (true);
create policy "Auth full access" on public.tasks
  for all to authenticated using (true);
create policy "Auth full access" on public.reports
  for all to authenticated using (true);
create policy "Auth full access" on public.lead_status_changes
  for all to authenticated using (true);
create policy "Auth full access" on public.automation_logs
  for all to authenticated using (true);
create policy "Auth full access" on public.settings
  for all to authenticated using (true);

-- 3) El formulario público de la web inserta leads SIN sesión.
--    La inserción anónima se hace EXCLUSIVAMENTE a través del endpoint
--    /api/contact, que usa la service role (omite RLS). Así NO necesitamos
--    abrir la tabla leads al anon.

-- Nota: la service role (rol `service_role`) ignora RLS siempre.
