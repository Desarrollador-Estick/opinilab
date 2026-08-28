-- ============================================================
-- Migración 001: Esquema inicial completo
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- ESTE ES EL ESQUEMA CANÓNICO (coincide con src/types/database.ts).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS & AUTH
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text default 'admin' check (role in ('admin', 'manager', 'member', 'client')),
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  website text,
  address text,
  city text,
  province text,
  postal_code text,
  nif_cif text,
  industry text,
  google_maps_url text,
  notes text,
  status text default 'active' check (status in ('active', 'paused', 'churned', 'prospect')),
  lead_source text,
  monthly_budget decimal(10,2) default 0,
  stripe_customer_id text,
  stripe_default_payment_method_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SERVICES
-- ============================================================
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category text check (category in ('reviews', 'social_media', 'seo', 'ads', 'email', 'branding', 'web')),
  base_price decimal(10,2) not null,
  billing_cycle text default 'monthly' check (billing_cycle in ('one_time', 'monthly', 'quarterly', 'yearly')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.client_services (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  service_id uuid references public.services on delete cascade not null,
  custom_price decimal(10,2),
  status text default 'active' check (status in ('active', 'paused', 'cancelled')),
  start_date date default current_date,
  end_date date,
  created_at timestamptz default now()
);

-- ============================================================
-- CONTRACTS
-- ============================================================
create table if not exists public.contracts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  contract_number text unique not null,
  title text not null,
  content text,
  status text default 'draft' check (status in ('draft', 'sent', 'signed', 'expired', 'terminated')),
  value decimal(10,2) not null,
  start_date date not null,
  end_date date,
  signed_at timestamptz,
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INVOICING
-- ============================================================
create table if not exists public.invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  invoice_number text unique not null,
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal decimal(10,2) not null,
  tax_rate decimal(5,2) default 21.00,
  tax_amount decimal(10,2) default 0,
  total decimal(10,2) not null,
  issue_date date default current_date,
  due_date date,
  paid_at timestamptz,
  notes text,
  pdf_url text,
  stripe_payment_intent_id text,
  stripe_payment_method text,
  payment_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  description text not null,
  quantity decimal(10,2) default 1,
  unit_price decimal(10,2) not null,
  total decimal(10,2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  amount decimal(10,2) not null,
  payment_method text check (payment_method in ('bank_transfer', 'card', 'cash', 'paypal', 'other')),
  payment_date date default current_date,
  reference text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- REVIEWS MANAGEMENT
-- ============================================================
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  platform text default 'google' check (platform in ('google', 'trustpilot', 'facebook', 'yelp')),
  reviewer_name text,
  rating integer check (rating >= 1 and rating <= 5),
  review_text text,
  review_date timestamptz,
  response_text text,
  response_date timestamptz,
  status text default 'new' check (status in ('new', 'responded', 'flagged', 'archived')),
  review_url text,
  created_at timestamptz default now()
);

create table if not exists public.review_requests (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  review_id uuid references public.reviews on delete set null,
  platform text default 'google' check (platform in ('google', 'trustpilot', 'facebook', 'yelp')),
  customer_name text,
  customer_email text,
  customer_phone text,
  message text,
  status text default 'pending' check (status in ('pending', 'sent', 'opened', 'completed', 'failed')),
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- SOCIAL MEDIA
-- ============================================================
create table if not exists public.social_accounts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  platform text not null check (platform in ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok')),
  account_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  followers_count integer default 0,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_posts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  social_account_id uuid references public.social_accounts on delete cascade,
  content text not null,
  media_urls text[],
  scheduled_at timestamptz,
  published_at timestamptz,
  platform text not null check (platform in ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok')),
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed', 'deleted')),
  engagement_likes integer default 0,
  engagement_comments integer default 0,
  engagement_shares integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- SEO
-- ============================================================
create table if not exists public.seo_audits (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  url text not null,
  score integer check (score >= 0 and score <= 100),
  issues_found integer default 0,
  results jsonb default '{}'::jsonb,
  recommendations text,
  created_at timestamptz default now()
);

-- ============================================================
-- LEADS & CAPTATION
-- ============================================================
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  city text,
  industry text,
  source text check (source in ('google_maps', 'directory', 'website', 'referral', 'cold_outreach', 'social')),
  status text default 'new' check (status in ('new', 'contacted', 'interested', 'proposal_sent', 'negotiation', 'won', 'lost')),
  score integer default 0 check (score >= 0 and score <= 100),
  notes text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  converted_client_id uuid references public.clients,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- EMAIL
-- ============================================================
create table if not exists public.email_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  subject text not null,
  body text not null,
  category text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.email_sends (
  id uuid default uuid_generate_v4() primary key,
  "to" text not null,
  "from" text,
  subject text,
  template text,
  client_id uuid references public.clients on delete set null,
  lead_id uuid references public.leads on delete set null,
  resend_id text,
  data jsonb default '{}'::jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS & PROJECT MANAGEMENT
-- ============================================================
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- REPORTS
-- ============================================================
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade,
  title text not null,
  report_type text default 'monthly'
    check (report_type in ('monthly', 'quarterly', 'custom', 'seo', 'social', 'review')),
  period_start date,
  period_end date,
  content jsonb default '{}'::jsonb,
  pdf_url text,
  status text default 'draft'
    check (status in ('draft', 'generated', 'sent')),
  created_at timestamptz default now()
);

-- ============================================================
-- ADDITIONAL TABLES
-- ============================================================
create table if not exists public.lead_status_changes (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads on delete cascade not null,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles,
  notes text,
  changed_at timestamptz default now()
);

create table if not exists public.automation_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  status text default 'success' check (status in ('success', 'error', 'pending')),
  error_message text,
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  category text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_clients_stripe_customer on public.clients(stripe_customer_id);
create index if not exists idx_clients_stripe_pm on public.clients(stripe_default_payment_method_id);
create index if not exists idx_client_services_client on public.client_services(client_id);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_stripe_pi on public.invoices(stripe_payment_intent_id);
create index if not exists idx_invoices_payment_token on public.invoices(payment_token) where payment_token is not null;
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_reviews_client on public.reviews(client_id);
create index if not exists idx_reviews_status on public.reviews(status);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_source on public.leads(source);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_assigned on public.tasks(assigned_to);
create index if not exists idx_social_posts_status on public.social_posts(status);
create index if not exists idx_email_sends_status on public.email_sends(status);
create index if not exists idx_lead_status_changes_lead on public.lead_status_changes(lead_id);
create index if not exists idx_automation_logs_action on public.automation_logs(action);
create index if not exists idx_settings_key on public.settings(key);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.client_services enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.review_requests enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_posts enable row level security;
alter table public.seo_audits enable row level security;
alter table public.leads enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_sends enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;
alter table public.lead_status_changes enable row level security;
alter table public.automation_logs enable row level security;
alter table public.settings enable row level security;

-- ============================================================
-- POLICIES (aplicado también en la migración 005; aquí queda sin cambiar)
-- Las políticas correctas (rol authenticated) están en 005_rls_hardening.sql
-- ============================================================

-- ============================================================
-- SEED DATA - SERVICES
-- ============================================================
insert into public.services (name, description, category, base_price, billing_cycle) values
('Gestión de Reseñas Google', 'Captación y gestión de reseñas en Google Maps', 'reviews', 199, 'monthly'),
('Community Management', 'Gestión completa de 2 redes sociales', 'social_media', 499, 'monthly'),
('SEO Básico', 'Optimización on-page y keyword research', 'seo', 299, 'monthly'),
('SEO Avanzado', 'SEO + link building + content strategy', 'seo', 599, 'monthly'),
('Google Ads', 'Gestión de campañas Google Ads', 'ads', 399, 'monthly'),
('Meta Ads', 'Gestión de campañas Facebook/Instagram', 'ads', 399, 'monthly'),
('Email Marketing', 'Secuencias automatizadas + newsletters', 'email', 249, 'monthly'),
('Branding Básico', 'Logo + paleta de colores + manual básico', 'branding', 799, 'one_time'),
('Branding Premium', 'Identidad completa + guía de marca', 'branding', 1999, 'one_time'),
('Landing Page', 'Página de aterrizaje optimizada para conversión', 'web', 599, 'one_time')
on conflict do nothing;

-- ============================================================
-- SEED DATA - SETTINGS
-- ============================================================
insert into public.settings (key, value) values
('company_name', '"Agencia Marketing"'),
('company_nif', '""'),
('company_address', '""'),
('company_city', '""'),
('company_postal', '""'),
('invoice_series', '"FAC"'),
('invoice_next_number', '1'),
('contract_series', '"CON"'),
('contract_next_number', '1'),
('tax_rate', '21'),
('payment_days', '30'),
('email_provider', '"resend"'),
('email_from', '"hola@agenciamarketing.com"')
on conflict do nothing;
