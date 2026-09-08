-- 026: Facturación 50/50 para proyectos one_time, iniciación+mes para monthly,
--      barra de seguimiento de proyecto, congelación a 3 días.
--
--  - client_services: columnas project_status, project_progress y managed_by
--    para el seguimiento del avance del proyecto.
--  - GRACE_DAYS se reduce a 3 en el código (run-monthly + automation).
--  - chargeInitialInvoice sustituye a chargeSetupFee:
--      · monthly + waive_setup=false → 1 factura: "Iniciación" (setup_fee) +
--        "Servicios del mes [YYYY-MM]" (base_price).
--      · one_time → factura 1 = 50% del total, second_invoice pendiente.
--  - Al marcar proyecto completado se crea la 2ª factura (50% restante).

alter table public.client_services
  add column if not exists project_status text
    default 'not_started'
    check (project_status in ('not_started','in_progress','completed','delivered'));

alter table public.client_services
  add column if not exists project_progress integer
    default 0;

alter table public.client_services
  add column if not exists managed_by text
    default null
    check (managed_by in ('ai','manual',null));