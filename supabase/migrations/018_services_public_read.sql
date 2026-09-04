-- 018: Política pública de lectura para servicios activos (landing page).

DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services"
  ON public.services
  FOR SELECT
  USING (is_active = true);
