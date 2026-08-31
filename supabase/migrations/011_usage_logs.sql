-- Registro de uso real de IAs (Groq) para el panel de "Consumo & Límites".
-- Cada llamada a groqChat() desde el servidor inserta una fila con tokens reales.
-- Las inserciones se hacen con la service role key (omite RLS).
-- Solo el equipo de la agencia (rol agencia) puede leer y gestionar.

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'groq',
  model text,
  category text,                        -- servicio: seo, reviews, email, social_media, ads, branding, web, contact
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_tokens integer not null default 0,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_created_at_idx on public.usage_logs (created_at);
create index if not exists usage_logs_category_idx on public.usage_logs (category);

alter table public.usage_logs enable row level security;

drop policy if exists "Agency full access usage_logs" on public.usage_logs;
create policy "Agency full access usage_logs" on public.usage_logs
  for all to authenticated
  using (is_agency_role())
  with check (is_agency_role());
