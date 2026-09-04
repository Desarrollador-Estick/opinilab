-- 017: Lead scraper automático con Overpass API (OpenStreetMap).
-- Busca negocios locales sin presencia digital y los crea como leads.
-- Gratis: sin API key, sin coste.

-- ============================================================
-- 1. Añadir 'auto_scraped' al check constraint de leads.source
-- ============================================================
alter table public.leads
  drop constraint if exists leads_source_check;

alter table public.leads
  add constraint leads_source_check
  check (source in ('google_maps', 'directory', 'website', 'referral', 'cold_outreach', 'social', 'auto_scraped'));

-- ============================================================
-- 2. Tabla de log de ejecuciones del scraper
-- ============================================================
create table if not exists public.lead_scraper_log (
  id uuid default uuid_generate_v4() primary key,
  run_date timestamptz default now(),
  leads_found integer default 0,
  leads_created integer default 0,
  leads_skipped integer default 0,
  errors text,
  config_snapshot jsonb,
  duration_ms integer,
  created_at timestamptz default now()
);

create index if not exists idx_lead_scraper_log_date on public.lead_scraper_log(run_date desc);

-- ============================================================
-- 3. Configuración del scraper en la tabla settings (key-value)
--    key = 'lead_scraper_config'
-- ============================================================
insert into public.settings (key, value, category, description)
values (
  'lead_scraper_config',
  '{
    "enabled": false,
    "daily_limit": 20,
    "categories": ["restaurant", "dentist", "hairdresser", "gym", "clinic", "pharmacy", "bakery", "hotel"],
    "countries": ["ES"],
    "cities": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Bilbao"],
    "min_rating": 3.0,
    "min_reviews": 5,
    "search_radius_m": 5000,
    "exclude_without_website": false
  }'::jsonb,
  'automation',
  'Configuración del lead scraper automático (Overpass API / OpenStreetMap)'
)
on conflict (key) do nothing;

-- ============================================================
-- 4. RLS: solo agencia puede ver el log
-- ============================================================
alter table public.lead_scraper_log enable row level security;

drop policy if exists "Agency full access scraper_log" on public.lead_scraper_log;
create policy "Agency full access scraper_log" on public.lead_scraper_log
  for all using (auth.uid() in (
    select id from public.profiles where role in ('admin', 'manager', 'member')
  ));
