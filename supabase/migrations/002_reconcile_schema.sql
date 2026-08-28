-- ============================================================
-- Migración 002: Reconciliación de esquema (antiguo -> canónico)
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente.
--
-- Alinea una base que ya tiene el esquema ANTIGUO al esquema
-- CANÓNICO que consume el código de la app, SIN borrar datos.
-- ============================================================

-- ============================================================
-- email_sends: añadir columnas que usa el código (send.ts)
-- ============================================================
alter table public.email_sends
  add column if not exists "from" text;
alter table public.email_sends
  add column if not exists "to" text;
alter table public.email_sends
  add column if not exists template text;
alter table public.email_sends
  add column if not exists resend_id text;
alter table public.email_sends
  add column if not exists data jsonb default '{}'::jsonb;
alter table public.email_sends
  add column if not exists subject text;
alter table public.email_sends
  add column if not exists client_id uuid references public.clients on delete set null;
alter table public.email_sends
  add column if not exists lead_id uuid references public.leads on delete set null;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='email_sends'
             and column_name='email_to') then
    update public.email_sends set "to" = email_to where ("to" is null or "to" = '');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='email_sends'
             and column_name='template_id') then
    update public.email_sends set template = template_id::text
      where (template is null or template = '');
  end if;
end $$;

-- ============================================================
-- social_accounts: canónico usa is_active/token_expires_at/last_synced_at
-- ============================================================
alter table public.social_accounts
  add column if not exists is_active boolean default true;
alter table public.social_accounts
  add column if not exists token_expires_at timestamptz;
alter table public.social_accounts
  add column if not exists last_synced_at timestamptz;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='social_accounts'
             and column_name='is_connected') then
    update public.social_accounts set is_active = is_connected;
  end if;
end $$;

-- ============================================================
-- social_posts: canónico usa engagement_likes/comments/shares
-- ============================================================
alter table public.social_posts
  add column if not exists engagement_likes integer default 0;
alter table public.social_posts
  add column if not exists engagement_comments integer default 0;
alter table public.social_posts
  add column if not exists engagement_shares integer default 0;

-- ============================================================
-- seo_audits: canónico usa issues_found/results/recommendations(text)
-- ============================================================
alter table public.seo_audits
  add column if not exists issues_found integer default 0;
alter table public.seo_audits
  add column if not exists results jsonb default '{}'::jsonb;
alter table public.seo_audits
  add column if not exists recommendations text;

-- ============================================================
-- review_requests: canónico usa customer_name/customer_phone/customer_email
-- ============================================================
alter table public.review_requests
  add column if not exists customer_phone text;
alter table public.review_requests
  add column if not exists review_id uuid references public.reviews on delete set null;
alter table public.review_requests
  add column if not exists platform text default 'google'
    check (platform in ('google', 'trustpilot', 'facebook', 'yelp'));
alter table public.review_requests
  add column if not exists message text;
alter table public.review_requests
  add column if not exists opened_at timestamptz;
alter table public.review_requests
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='review_requests'
             and column_name='reviewed_at') then
    update public.review_requests set completed_at = reviewed_at
      where completed_at is null;
  end if;
end $$;

update public.review_requests set status = 'completed' where status = 'reviewed';
update public.review_requests set status = 'failed' where status = 'expired';

-- ============================================================
-- email_templates: canónico usa is_active/updated_at
-- ============================================================
alter table public.email_templates
  add column if not exists is_active boolean default true;
alter table public.email_templates
  add column if not exists updated_at timestamptz default now();

-- ============================================================
-- reports: canónico usa report_type/period_start/period_end/status
-- ============================================================
alter table public.reports
  add column if not exists report_type text;
alter table public.reports
  add column if not exists period_start date;
alter table public.reports
  add column if not exists period_end date;
alter table public.reports
  add column if not exists status text;

-- ============================================================
-- lead_status_changes: canónico usa old_status/new_status/changed_at
-- ============================================================
alter table public.lead_status_changes
  add column if not exists old_status text;
alter table public.lead_status_changes
  add column if not exists new_status text;
alter table public.lead_status_changes
  add column if not exists changed_at timestamptz default now();

-- ============================================================
-- automation_logs: canónico usa action/details/status
-- ============================================================
alter table public.automation_logs
  add column if not exists error_message text;
alter table public.automation_logs
  add column if not exists entity_type text;
alter table public.automation_logs
  add column if not exists entity_id uuid;

-- ============================================================
-- settings: canónico usa category/description
-- ============================================================
alter table public.settings
  add column if not exists category text;
alter table public.settings
  add column if not exists description text;
alter table public.settings
  add column if not exists created_at timestamptz default now();

-- ============================================================
-- clients: columnas Stripe (idempotente)
-- ============================================================
alter table public.clients
  add column if not exists stripe_customer_id text;
alter table public.clients
  add column if not exists stripe_default_payment_method_id text;
create index if not exists idx_clients_stripe_customer on public.clients(stripe_customer_id);
create index if not exists idx_clients_stripe_pm on public.clients(stripe_default_payment_method_id);

-- ============================================================
-- invoices: columnas Stripe + payment_token (idempotente)
-- ============================================================
alter table public.invoices
  add column if not exists stripe_payment_intent_id text;
alter table public.invoices
  add column if not exists stripe_payment_method text;
alter table public.invoices
  add column if not exists payment_token text;
create index if not exists idx_invoices_stripe_pi on public.invoices(stripe_payment_intent_id);
create index if not exists idx_invoices_payment_token
  on public.invoices(payment_token) where payment_token is not null;

-- ============================================================
-- Generador de token de pago (idempotente)
-- ============================================================
create or replace function public.generate_payment_token()
returns text
language sql
as $$
  select replace(gen_random_uuid()::text, '-', '')
$$;
