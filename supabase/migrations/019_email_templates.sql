-- ============================================================
-- 019: PLANTILLAS DE EMAIL EDITABLES
-- ============================================================
-- La tabla public.email_templates ya existe (001_initial_schema.sql) con
-- columnas: id, name, subject, body, category, is_active, created_at, updated_at.
-- Esta migración la adapta para ser editable desde el panel:
--   - Añade `key` (clave única de la plantilla: lead_contact, followup_1, ...)
--   - Añade `variables` (array de nombres de variables para sustituir)
--   - Añade RLS de agencia (misma política que el resto de tablas de la agencia)
--   - Inserta las plantillas por defecto si no existen
-- ============================================================

alter table public.email_templates
  add column if not exists key text,
  add column if not exists variables text[] not null default '{}';

-- key único: rellena claves para filas existentes que no la tengan (por nombre)
update public.email_templates
set key = lower(regexp_replace(coalesce(name, 'template'), '[^a-zA-Z0-9]+', '_', 'g'))
where key is null or key = '';

create unique index if not exists idx_email_templates_key
  on public.email_templates (key);

-- ============================================================
-- RLS: la agencia gestiona las plantillas (misma política que en 006/007)
-- ============================================================
alter table public.email_templates enable row level security;

drop policy if exists "Agency full access email_templates" on public.email_templates;
create policy "Agency full access email_templates"
  on public.email_templates
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'manager', 'member')
    )
  );

-- ============================================================
-- SEED: plantillas por defecto (solo si no existen por key)
-- La columna de contenido es `body` (HTML) y se usa `subject` para el asunto.
-- Variable placeholder: {business}, {name}, {lead_name} ...
-- ============================================================
insert into public.email_templates (key, name, subject, body, category, is_active)
select * from (values
  ('lead_contact',
   'Contacto inicial lead',
   'Análisis gratuito de presencia online para {business}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Hemos analizado la presencia online de <strong>{business}</strong> en Google y en redes sociales.</p>
     <p>Hemos detectado oportunidades de mejora que podrían atraer más clientes a tu negocio.</p>
     <p>¿Te gustaría que te mostremos un análisis gratuito y sin compromiso?</p>
     <p>Un saludo,<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true),
  ('followup_1',
   'Follow-up 1',
   '¿Te interesa mejorar tu presencia online?',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Hace unos días te enviamos un análisis gratuito sobre <strong>{business}</strong>.</p>
     <p>Queríamos saber si te interesaría recibir más información sobre cómo podemos ayudarte a conseguir más clientes.</p>
     <p>Puedes responder directamente a este email.</p>
     <p>¡Gracias por tu tiempo!<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true),
  ('followup_2',
   'Follow-up 2',
   'Última oportunidad - Análisis gratuito',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Esta es nuestra última comunicación sobre el análisis gratuito de <strong>{business}</strong>.</p>
     <p>Si ya no te interesa, por favor responde con "no interesado" y no te molestaremos más.</p>
     <p>Si te gustaría saber más, estaremos encantados de ayudarte.</p>
     <p>Un saludo,<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true)
) as seed(key, name, subject, body, category, is_active)
where not exists (select 1 from public.email_templates where key = seed.key);