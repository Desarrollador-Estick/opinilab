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