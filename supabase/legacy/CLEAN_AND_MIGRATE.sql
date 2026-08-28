-- LIMPIEZA: Eliminar tablas existentes (en orden por dependencias)
DROP TABLE IF EXISTS public.lead_status_changes CASCADE;
DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.email_sends CASCADE;
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.social_accounts CASCADE;
DROP TABLE IF EXISTS public.seo_audits CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.review_requests CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.client_services CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- AGENCIA DE MARKETING - DATABASE SCHEMA
-- ============================================

create extension if not exists "uuid-ossp";

-- USERS & AUTH
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text default 'admin' check (role in ('admin', 'manager', 'member', 'client')),
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CLIENTS
create table public.clients (
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SERVICES
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category text check (category in ('reviews', 'social_media', 'seo', 'ads', 'email', 'branding', 'web')),
  base_price decimal(10,2) not null,
  billing_cycle text default 'monthly' check (billing_cycle in ('one_time', 'monthly', 'quarterly', 'yearly')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.client_services (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  service_id uuid references public.services on delete cascade not null,
  custom_price decimal(10,2),
  status text default 'active' check (status in ('active', 'paused', 'cancelled')),
  start_date date default current_date,
  end_date date,
  created_at timestamptz default now()
);

-- CONTRACTS
create table public.contracts (
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

-- INVOICING
create table public.invoices (
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.invoice_items (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  description text not null,
  quantity decimal(10,2) default 1,
  unit_price decimal(10,2) not null,
  total decimal(10,2) not null,
  created_at timestamptz default now()
);

-- PAYMENTS
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  invoice_id uuid references public.invoices on delete cascade not null,
  amount decimal(10,2) not null,
  payment_method text check (payment_method in ('bank_transfer', 'card', 'cash', 'paypal', 'other')),
  payment_date date default current_date,
  reference text,
  notes text,
  created_at timestamptz default now()
);

-- REVIEWS
create table public.reviews (
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

create table public.review_requests (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text default 'pending' check (status in ('pending', 'sent', 'opened', 'reviewed', 'expired')),
  sent_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- SOCIAL MEDIA
create table public.social_accounts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'youtube')),
  account_name text,
  access_token text,
  refresh_token text,
  followers_count integer default 0,
  is_connected boolean default false,
  created_at timestamptz default now()
);

create table public.social_posts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  social_account_id uuid references public.social_accounts on delete cascade,
  platform text not null,
  content text,
  media_urls text[],
  scheduled_at timestamptz,
  published_at timestamptz,
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  engagement_likes integer default 0,
  engagement_comments integer default 0,
  engagement_shares integer default 0,
  created_at timestamptz default now()
);

-- SEO
create table public.seo_audits (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  url text not null,
  score integer check (score >= 0 and score <= 100),
  issues jsonb default '[]'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  keywords_ranking jsonb default '{}'::jsonb,
  backlinks_count integer default 0,
  page_speed_mobile integer,
  page_speed_desktop integer,
  created_at timestamptz default now()
);

-- LEADS
create table public.leads (
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

-- EMAIL
create table public.email_templates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  subject text not null,
  body text not null,
  category text check (category in ('cold_outreach', 'follow_up', 'onboarding', 'report', 'invoice', 'newsletter')),
  created_at timestamptz default now()
);

create table public.email_sends (
  id uuid default uuid_generate_v4() primary key,
  "to" text not null,
  "from" text,
  subject text,
  template text,
  resend_id text,
  data jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

-- TASKS
create table public.tasks (
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

-- REPORTS
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  title text not null,
  report_type text check (report_type in ('monthly', 'quarterly', 'custom', 'seo', 'social', 'reviews')),
  period_start date,
  period_end date,
  content jsonb default '{}'::jsonb,
  pdf_url text,
  status text default 'draft' check (status in ('draft', 'generated', 'sent')),
  created_at timestamptz default now()
);

-- ADDITIONAL TABLES
create table public.lead_status_changes (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads on delete cascade not null,
  old_status text,
  new_status text not null,
  notes text,
  changed_by uuid references public.profiles,
  created_at timestamptz default now()
);

create table public.automation_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb default '{}'::jsonb,
  status text default 'success' check (status in ('success', 'failed', 'skipped')),
  created_at timestamptz default now()
);

create table public.settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- INDEXES
create index idx_clients_status on public.clients(status);
create index idx_client_services_client on public.client_services(client_id);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_status on public.invoices(status);
create index idx_payments_invoice on public.payments(invoice_id);
create index idx_reviews_client on public.reviews(client_id);
create index idx_reviews_status on public.reviews(status);
create index idx_leads_status on public.leads(status);
create index idx_leads_source on public.leads(source);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_assigned on public.tasks(assigned_to);
create index idx_social_posts_status on public.social_posts(status);
create index idx_email_sends_status on public.email_sends(status);
create index idx_lead_status_changes_lead on public.lead_status_changes(lead_id);
create index idx_automation_logs_action on public.automation_logs(action);
create index idx_settings_key on public.settings(key);

-- ROW LEVEL SECURITY
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

-- POLICIES
create policy "Admin full access" on public.profiles for all using (role = 'admin');
create policy "Admin full access" on public.clients for all using (true);
create policy "Admin full access" on public.services for all using (true);
create policy "Admin full access" on public.client_services for all using (true);
create policy "Admin full access" on public.contracts for all using (true);
create policy "Admin full access" on public.invoices for all using (true);
create policy "Admin full access" on public.invoice_items for all using (true);
create policy "Admin full access" on public.payments for all using (true);
create policy "Admin full access" on public.reviews for all using (true);
create policy "Admin full access" on public.review_requests for all using (true);
create policy "Admin full access" on public.social_accounts for all using (true);
create policy "Admin full access" on public.social_posts for all using (true);
create policy "Admin full access" on public.seo_audits for all using (true);
create policy "Admin full access" on public.leads for all using (true);
create policy "Admin full access" on public.email_templates for all using (true);
create policy "Admin full access" on public.email_sends for all using (true);
create policy "Admin full access" on public.tasks for all using (true);
create policy "Admin full access" on public.reports for all using (true);
create policy "Admin full access" on public.lead_status_changes for all using (true);
create policy "Admin full access" on public.automation_logs for all using (true);
create policy "Admin full access" on public.settings for all using (true);

-- SEED DATA - SERVICES
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
('Landing Page', 'Página de aterrizaje optimizada para conversión', 'web', 599, 'one_time');

-- SEED DATA - SETTINGS
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
('email_from', '"hola@agenciamarketing.com"');
