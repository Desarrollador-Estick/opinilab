-- 022: Campaña de captación (primeros 5 clientes, nicho estética).
--  - Cuota de "Gestión de datos" (alta) configurable y omisible por servicio.
--  - Scraper enfocado a estética/peluquería/salones en Madrid.
--  - Auto-contacto por email de leads (outbound_1 -> followup_1 -> followup_2).
--  - Servicio de oferta de lanzamiento a 49€/mes sin cuota de alta.

-- ============================================================
-- 1. services.waive_setup: permite contratar un servicio sin cobrar
--    la cuota de "Gestión de datos" (plan de lanzamiento).
-- ============================================================
alter table public.services
  add column if not exists waive_setup boolean not null default false;

-- ============================================================
-- 2. Cuota de "Gestión de datos" por defecto (49€, configurable en
--    Configuración -> Facturación). Solo si no está ya definida.
-- ============================================================
insert into public.settings (key, value, category, description)
values (
  'setup_fee',
  '49'::jsonb,
  'billing',
  'Cuota de gestión de datos (alta) que se factura en la primera factura de cada servicio nuevo'
)
on conflict (key) do nothing;

-- ============================================================
-- 3. Scraper: campaña focalizada en estética/peluquería/salones
--    de Madrid. Merge (no pisa el resto de opciones).
-- ============================================================
insert into public.settings (key, value, category, description)
values (
  'lead_scraper_config',
  '{
    "enabled": true,
    "daily_limit": 25,
    "categories": ["beauty", "hairdresser", "spa"],
    "countries": ["ES"],
    "cities": ["Madrid"],
    "min_rating": 4.0,
    "min_reviews": 10,
    "search_radius_m": 8000,
    "exclude_without_website": false
  }'::jsonb,
  'automation',
  'Configuración del lead scraper automático (Overpass API / OpenStreetMap)'
)
on conflict (key) do update
  set value = settings.value || excluded.value,
      description = excluded.description,
      updated_at = now();

-- ============================================================
-- 4. Automatización: activar el auto-contacto de leads del scraper.
-- ============================================================
insert into public.settings (key, value, category, description)
values (
  'automation_emails_config',
  '{"lead_auto_outreach_enabled": true}'::jsonb,
  'automation',
  'Configuración de automatizaciones de email: auto-contacto de leads del scraper, solicitudes de reseñas, borradores IA e informes mensuales'
)
on conflict (key) do update
  set value = settings.value || excluded.value,
      description = excluded.description,
      updated_at = now();

-- ============================================================
-- 5. Plantillas de la campaña (se pueden editar luego desde el panel).
--    Placeholders soportados: {name}, {business}, {company}.
-- ============================================================
insert into public.email_templates (key, name, subject, body, category, is_active)
select * from (values
  ('outbound_1',
   'Outbound 1 (primer contacto)',
   'Análisis gratuito de tu ficha de Google para {business}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Hemos visto <strong>{business}</strong> en Google y creemos que puedes atraer más clientes de tu zona.</p>
     <p>En {company} nos encargamos de que tu ficha de Google y tus reseñas trabajen por ti:</p>
     <ul>
       <li>- Conseguimos reseñas nuevas de forma continuada</li>
       <li>- Respondemos por ti y cuidamos tu reputación online</li>
       <li>- Mejoramos tu presencia para que te encuentren más clientes del barrio</li>
     </ul>
      <p>Oferta de lanzamiento para los primeros negocios de tu zona: <strong>49€/mes</strong>, sin cuota de gestión de datos.</p>
     <p>Te enviamos un <strong>análisis gratuito de tu ficha</strong> sin compromiso: responde a este email y lo preparamos.</p>
     <p>Un saludo,<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true),
  ('followup_1',
   'Follow-up 1',
   '¿Te interesa el análisis gratuito de {business}?',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Hace unos días te escribimos sobre <strong>{business}</strong>.</p>
      <p>La oferta de lanzamiento para los primeros negocios de tu zona sigue disponible: <strong>49€/mes</strong>, sin cuota de gestión de datos.</p>
     <p>¿Quieres que te preparemos el análisis gratuito de tu ficha de Google?</p>
     <p>Puedes responder directamente a este email.</p>
     <p>¡Gracias por tu tiempo!<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true),
  ('followup_2',
   'Follow-up 2',
    'Último aviso: oferta 49€/mes para {business}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <h2>Hola {name},</h2>
     <p>Esta es nuestra última comunicación sobre <strong>{business}</strong>.</p>
      <p>La oferta de lanzamiento es <strong>49€/mes</strong> y sin cuota de gestión de datos.</p>
     <p>Si todavía te interesa tu análisis gratuito, responde a este email.</p>
     <p>Si ya no te interesa, responde con "no interesado" y no volveremos a escribirte.</p>
     <p>Un saludo,<br><strong>Equipo de {company}</strong></p>
   </div>',
   'lead',
   true)
) as seed(key, name, subject, body, category, is_active)
on conflict (key) do update
  set name = excluded.name,
      subject = excluded.subject,
      body = excluded.body,
      category = excluded.category,
      is_active = excluded.is_active,
      updated_at = now();

-- ============================================================
-- 6. Servicio de oferta de lanzamiento (49€/mes, sin cuota de alta).
-- ============================================================
insert into public.services (name, description, category, base_price, billing_cycle, is_active, waive_setup)
select
  'Plan Lanzamiento 49€/mes',
  'Oferta de lanzamiento para los primeros negocios de estética: gestión de reseñas de Google y reputación online por 49€/mes, sin cuota de gestión de datos.',
  'reviews',
  49,
  'monthly',
  true,
  true
where not exists (
  select 1 from public.services where lower(name) = lower('Plan Lanzamiento 49€/mes')
);