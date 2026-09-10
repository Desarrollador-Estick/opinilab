-- 027: WhatsApp promotions support
-- Adds phone column to promo_recipients, whatsapp tracking, and whatsapp_sends table

-- 1. Add phone and WhatsApp columns to promo_recipients
ALTER TABLE public.promo_recipients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_status text DEFAULT 'pending'
    CHECK (whatsapp_status IN ('pending', 'sent', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_promo_recipients_whatsapp_status
  ON public.promo_recipients(whatsapp_status);

-- 2. Create whatsapp_sends table (parallel to email_sends)
CREATE TABLE IF NOT EXISTS public.whatsapp_sends (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id uuid REFERENCES public.promo_recipients(id) ON DELETE SET NULL,
  phone       text NOT NULL,
  message     text NOT NULL,
  status      text DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id text,
  error       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sends_recipient
  ON public.whatsapp_sends(recipient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sends_status
  ON public.whatsapp_sends(status);

-- 3. RLS: agency members only (same as promo_recipients)
ALTER TABLE public.whatsapp_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Agency full access whatsapp_sends" ON public.whatsapp_sends;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Agency full access whatsapp_sends"
  ON public.whatsapp_sends FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'member')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'member')
  ));

-- 4. Add whatsapp message template to email_templates
INSERT INTO public.email_templates (key, category, subject, body, variables, is_active)
VALUES (
  'whatsapp_promo',
  'promo',
  'Promoción WhatsApp',
  'Hola {name} 👋\n\nSomos {company}. Hemos visto {business} y creemos que podemos ayudarte a:\n• Conseguir más reseñas en Google\n• Mejorar tu presencia en redes sociales\n• Atraer más clientes con SEO local\n\n¿Te gustaría una consulta gratuita y sin compromiso?\n\nResponde a este mensaje y te contamos cómo podemos empezar 🚀',
  ARRAY['name', 'business', 'company'],
  true
) ON CONFLICT DO NOTHING;
