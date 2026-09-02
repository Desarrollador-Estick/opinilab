-- ============================================================
-- Migración 014: client_tools — herramientas y credenciales del cliente
-- Ejecuta este script completo en:
--   Supabase Dashboard → SQL Editor → New query → Run
-- Idempotente: puedes ejecutarlo varias veces sin errores.
--
-- QUÉ HACE:
--  1. Crea la tabla `client_tools` para que cada cliente pueda guardar
--     las credenciales y URLs de las herramientas necesarias para los
--     servicios contratados (GBP, redes sociales, anuncios, etc.).
--  2. Aplica RLS: agencia accede a todo; el cliente solo ve sus propias
--     herramientas (vía client_id).
-- ============================================================

-- 1) Tabla
create table if not exists public.client_tools (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients on delete cascade not null,
  tool_type text not null
    check (tool_type in ('gbp', 'social_media', 'ads', 'web', 'email', 'other')),
  tool_name text not null,
  url text,
  username text,
  password_enc text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_client_tools_client on public.client_tools(client_id);

-- 2) RLS
alter table public.client_tools enable row level security;

-- Agencia (admin/manager/member): acceso total
create policy "Agency full access client_tools"
  on public.client_tools
  for all
  using (public.is_agency_role())
  with check (public.is_agency_role());

-- Cliente: solo sus propias herramientas
create policy "Client read own client_tools"
  on public.client_tools
  for select
  using (client_id = public.current_user_client_id());

create policy "Client insert own client_tools"
  on public.client_tools
  for insert
  with check (client_id = public.current_user_client_id());

create policy "Client update own client_tools"
  on public.client_tools
  for update
  using (client_id = public.current_user_client_id())
  with check (client_id = public.current_user_client_id());

create policy "Client delete own client_tools"
  on public.client_tools
  for delete
  using (client_id = public.current_user_client_id());
