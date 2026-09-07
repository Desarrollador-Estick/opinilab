-- 021: Refuerzo de captación de leads.
--  - Redes sociales y seguimiento de emails en leads.
--  - Configuración del scraper con enriquecimiento de emails (seguimiento).
--  - Previene servicios duplicados en admin/servicios.

-- ============================================================
-- 1. leads: columna de redes sociales (jsonb)
--    Ej.: {"facebook": "https://...", "instagram": "https://..."}
-- ============================================================
alter table public.leads
  add column if not exists social_media jsonb default '{}'::jsonb;

-- 2. leads: marca de cuándo se intentó buscar el email (seguimiento).
--    Evita volver a scrapear el mismo negocio cada día.
alter table public.leads
  add column if not exists email_last_attempt_at timestamptz;

-- 3. lead_scraper_log: contador de leads enriquecidos (seguimiento).
alter table public.lead_scraper_log
  add column if not exists leads_enriched integer default 0;

-- ============================================================
-- 4. Configuración del scraper: activar seguimiento de emails
--    y límite de enriquecimientos por ejecución.
-- ============================================================
update public.settings
set value = value || '{"enrich_without_email": true, "enrich_limit": 15}'::jsonb,
    updated_at = now()
where key = 'lead_scraper_config'
  and not (value ? 'enrich_without_email');

-- ============================================================
-- 5. Servicios duplicados: se deduplican los existentes y se
--    impone un índice único por nombre (insensible a mayúsculas).
--    Se conserva el servicio con id menor (más antiguo).
-- ============================================================
delete from public.services a
using public.services b
where a.id > b.id
  and lower(a.name) = lower(b.name);

create unique index if not exists idx_services_name_unique
  on public.services (lower(name));