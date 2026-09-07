-- 023: BAJA (UNSUBSCRIBE) DE EMAILS DE PROMOCIÓN / CAMPAÑA.
--  - Tabla de emails dados de baja: no se les vuelve a enviar publicidad.
--  - Amplía el estado de promo_recipients con 'skipped' (para los que ya
--    pidieron baja al intentar reenviarles).

-- ============================================================
-- 1. Tabla de supresiones (dentro de los requisitos RGPD/LSSI: opción
--    sencilla de darse de baja en todo correo comercial)
-- ============================================================
create table if not exists public.email_suppressions (
  email text primary key,
  source text default 'unsubscribe_link',
  created_at timestamptz default now()
);

create index if not exists idx_email_suppressions_created on public.email_suppressions(created_at desc);

-- RLS: solo se accede con el cliente admin (service role); sin políticas
-- públicas. El enlace de baja usa GET público pero verifica firma HMAC.
alter table public.email_suppressions enable row level security;

-- ============================================================
-- 2. promo_recipients: estado 'skipped' para los que ya se dieron de baja
-- ============================================================
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'promo_recipients_status_check'
      and conrelid = 'public.promo_recipients'::regclass
  ) then
    alter table public.promo_recipients drop constraint promo_recipients_status_check;
  end if;
end $$;

alter table public.promo_recipients
  add constraint promo_recipients_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped'));