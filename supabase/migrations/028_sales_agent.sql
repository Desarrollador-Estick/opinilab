-- 028: Agente de ventas IA — lectura de respuestas entrantes.
-- Tabla `email_replies`: guarda cada réplica de un lead/cliente recibida vía
-- Resend Inbound (dominio entrante) para que el agente IA la clasifique y
-- responda, siempre con puerta de aprobación humana antes de un contrato/cobro.

-- ============================================================
-- 1. Tabla email_replies
-- ============================================================
create table if not exists public.email_replies (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete set null,
  email_from text not null,
  from_name text,
  to_addr text,
  subject text,
  text_body text,
  message_id text,
  in_reply_to text,
  reply_type text,
  reply_status text default 'pending',
  confidence numeric,
  reason text,
  ai_reply text,
  sent_email_id uuid references public.email_sends(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_email_replies_lead on public.email_replies(lead_id);
create index if not exists idx_email_replies_from on public.email_replies(email_from);
create index if not exists idx_email_replies_created on public.email_replies(created_at desc);

-- ============================================================
-- 2. RLS: solo agencia puede leer/escribir respuestas
-- ============================================================
alter table public.email_replies enable row level security;

drop policy if exists "Agency full access email_replies" on public.email_replies;
create policy "Agency full access email_replies" on public.email_replies
  for all using (auth.uid() in (
    select id from public.profiles where role in ('admin', 'manager', 'member')
  ));