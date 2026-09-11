-- ============================================================
-- 029_privacy_compliance.sql
-- Cumplimiento RGPD/LSSI: registro de solicitudes de derechos
-- (acceso, rectificación, supresión, limitación, portabilidad,
--  oposición, baja de comunicaciones comerciales).
-- La entrada la crea el endpoint público /api/privacy/request con
-- la service role key (libre de RLS); la gestión (leer/resolver y
-- borrado real) la hace el equipo autenticado vía dashboard.
-- ============================================================

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text not null,
  request_type text not null
    check (request_type in ('acceso', 'rectificacion', 'supresion', 'limitacion', 'portabilidad', 'oposicion', 'baja_marketing')),
  details text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'resuelto', 'rechazado')),
  notes text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index if not exists idx_privacy_requests_email on public.privacy_requests(email);
create index if not exists idx_privacy_requests_status on public.privacy_requests(status);

alter table public.privacy_requests enable row level security;

create policy "Agency full access privacy_requests"
  on public.privacy_requests
  for all
  using (true)
  with check (true);