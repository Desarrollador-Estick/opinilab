-- 024: Seguimiento de visitas y clics en la landing (opinilab.com).
--  - page_events: registra visitas a la página y clics en enlaces/botones.
--  - Acceso público de escritura vía RLS (solo insert), lectura solo por equipo.
--  - La API /api/analytics/* resuelve las reglas y agrega los datos.

-- ============================================================
-- 1. Tabla de eventos
-- ============================================================
create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,            -- 'visit' | 'click'
  label text,                          -- nombre del elemento clickeado (CTA, link, etc.)
  path text not null,                  -- ruta donde ocurrió ('/' para la landing)
  url text,                            -- url completa del clic (si aplica, p. ej. enlace externo)
  referrer text,                       -- de dónde vino el visitante (document.referrer)
  user_agent text,                     -- navegador/dispositivo
  visitor_id text,                     -- id de sesión generado en cliente (anonimizado)
  created_at timestamptz not null default now()
);

create index if not exists page_events_created_idx on public.page_events(created_at desc);
create index if not exists page_events_type_idx on public.page_events(event_type);
create index if not exists page_events_label_idx on public.page_events(label);

-- Permitir a cualquiera INSERTAR eventos (público visita la landing), pero
-- impedir leer/actualizar/borrar. El panel de admin usa la service role.
alter table public.page_events enable row level security;

drop policy if exists "public can insert page_events" on public.page_events;
create policy "public can insert page_events"
  on public.page_events for insert
  to anon, authenticated, service_role
  with check (true);

-- ============================================================
-- 2. Datos maestros de guías (pendiente NO aplicado): no aplica a esta tabla.
-- ============================================================
