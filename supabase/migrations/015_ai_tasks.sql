-- ============================================================
-- Migración 015: ai_tasks — cola de tareas IA asignadas por el cliente
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- QUÉ HACE:
--  1. Crea la tabla `ai_tasks` que guarda las tareas de generación de
--     contenido con IA (Groq) que asigna cada cliente desde su portal,
--     ligadas a la categoría de un servicio contratado.
--     Estados:
--       queued     → en cola, pendiente de ejecutarse
--       waiting    → en LISTA DE ESPERA porque el cupo gratis se agotó
--       processing → en ejecución (llamada a Groq en curso)
--       done       → completada (resultado guardado)
--       failed     → error al ejecutar (error guardado)
--  2. Aplica RLS: agencia accede a todo; el cliente solo ve y crea sus
--     propias tareas (vía client_id).
-- ============================================================

-- 1) Tabla
create table if not exists public.ai_tasks (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  client_service_id uuid references public.client_services on delete set null,
  service_category text not null
    check (service_category in ('reviews', 'seo', 'email', 'social_media', 'ads', 'branding', 'web')),
  status text not null default 'queued'
    check (status in ('queued', 'waiting', 'processing', 'done', 'failed')),
  request_note text,
  result text,
  error text,
  client_read boolean not null default false,
  created_at timestamptz default now(),
  started_at timestamptz,
  processed_at timestamptz
);

create index if not exists idx_ai_tasks_client on public.ai_tasks(client_id);
create index if not exists idx_ai_tasks_status on public.ai_tasks(status, created_at);

-- 2) RLS
alter table public.ai_tasks enable row level security;

-- Agencia (admin/manager/member): acceso total
drop policy if exists "Agency full access ai_tasks" on public.ai_tasks;
create policy "Agency full access ai_tasks"
  on public.ai_tasks
  for all
  using (public.is_agency_role())
  with check (public.is_agency_role());

-- Cliente: solo sus propias tareas; puede crearlas, leerlas
drop policy if exists "Client read own ai_tasks" on public.ai_tasks;
create policy "Client read own ai_tasks"
  on public.ai_tasks
  for select
  using (client_id = public.current_user_client_id());

drop policy if exists "Client insert own ai_tasks" on public.ai_tasks;
create policy "Client insert own ai_tasks"
  on public.ai_tasks
  for insert
  with check (client_id = public.current_user_client_id());
