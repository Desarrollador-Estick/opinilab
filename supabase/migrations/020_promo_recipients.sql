-- ============================================================
-- 020: DESTINATARIOS DE EMAIL DE PROMOCIÓN (para captar clientes)
-- ============================================================
-- El admin añade manualmente contactos (nombre + email) a los que quiere
-- enviar el email de promoción de OpiniLab para convertirlos en clientes.
-- Tabla nueva con RLS de agencia (misma política que lead_scraper_log).

create table if not exists public.promo_recipients (
  id uuid default uuid_generate_v4() primary key,
  name text,
  email text not null,
  business_name text,
  notes text,
  status text default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_promo_recipients_status on public.promo_recipients(status);
create index if not exists idx_promo_recipients_email on public.promo_recipients(email);

-- ============================================================
-- RLS: solo la agencia (admin/manager/member) gestiona la lista
-- ============================================================
alter table public.promo_recipients enable row level security;

drop policy if exists "Agency full access promo_recipients" on public.promo_recipients;
create policy "Agency full access promo_recipients"
  on public.promo_recipients
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
-- SEED: plantilla editable 'promo_1' para el email de promoción.
-- Se edita desde /dashboard/configuracion → Email (clave promo_1).
-- Variables: {name}, {business}, {company}
-- ============================================================
insert into public.email_templates (key, name, subject, body, category, is_active)
select * from (values
  ('promo_1',
   'Promoción nuevos clientes',
   'Haz crecer {business} con {company}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
   '<div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">' ||
   '<h1 style="color: white; margin: 0;">🚀 {company}</h1></div>' ||
   '<div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">' ||
   '<p>Hola <strong>{name}</strong>,</p>' ||
   '<p>Hemos visto a <strong>{business}</strong> y creemos que <strong>{company}</strong> puede ayudarte a conseguir más clientes.</p>' ||
   '<ul><li>Aumentar tus reseñas en Google</li><li>Mejorar tu posicionamiento en buscadores</li><li>Atraer más clientes en redes sociales</li></ul>' ||
   '<p>Te ofrecemos una <strong>consulta gratuita y sin compromiso</strong> para analizar tu presencia online.</p>' ||
   '<p>Responde a este email y te contamos cómo podemos empezar.</p>' ||
   '<p>Un saludo,<br><strong>Equipo de {company}</strong></p></div></div>',
   'promo',
   true)
) as seed(key, name, subject, body, category, is_active)
where not exists (select 1 from public.email_templates where key = seed.key);