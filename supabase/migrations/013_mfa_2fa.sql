-- ============================================================
-- Migración 013: Seguridad Avanzada - MFA / 2FA (TOTP)
--
-- Confirma la aplicación de esta migración con:
--   supabase link --project-ref <ref>  +  supabase db push
-- (o directamente Supabase Dashboard → SQL Editor → Run).
-- Idempotente: se puede ejecutar varias veces sin errores.
--
-- QUÉ HACE:
--   Añade a `profiles` las columnas necesarias para 2FA con TOTP:
--     - totp_secret    : secreto compartido (guardado CIFRADO AES-256-GCM
--                        con la clave TOTP_ENC_KEY, solo legible/escrito
--                        desde el servidor con service role, nunca en claro).
--     - totp_enabled   : si el usuario tiene 2FA activo.
--     - totp_recovery  : códigos de respaldo guardados como HASH (no en claro).
--   Crea la tabla `audit_logs` para el trail de eventos de seguridad.
--
--   El acceso a `totp_secret`/`totp_recovery` se hace SIEMPRE desde el
--   servidor con la service role key (omite RLS). Al estar cifrados/hasheados,
--   aunque un policy los devolviera no serían explotables.
--
-- NOTA: solo el rol admin tiene "Admin full access" sobre `profiles` por RLS.
--       `totp_enabled` se leerá vía endpoint de servidor (service role), por lo
--       que no hace falta relajar RLS para que managers/members vean su estado.
-- ============================================================

alter table public.profiles
  add column if not exists totp_secret text,
  add column if not exists totp_enabled boolean not null default false,
  add column if not exists totp_recovery text[];

-- Tabla de auditoría: trail de eventos de seguridad y acciones sensibles.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);

-- RLS: el equipo de la agencia puede leer los propios logs; la escritura la hace
-- el servidor con service role. Solo usuarios autenticados de agencia pueden ver.
alter table public.audit_logs enable row level security;

drop policy if exists "Agency read audit_logs" on public.audit_logs;
create policy "Agency read audit_logs" on public.audit_logs
  for select to authenticated
  using (is_agency_role());
