-- 025: Contacto automático e inmediato de leads con email.
--  - El scraper lanza la campaña (outbound_1) nada más captar/enriquecer un
--    lead con email, sin esperar al cron de las 09:00 ni al botón manual.
--  - Se añade el contador de campañas lanzadas a lead_scraper_log.

alter table public.lead_scraper_log
  add column if not exists leads_outreached integer default 0;