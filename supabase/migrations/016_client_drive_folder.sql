-- 016: Carpeta de trabajo en Google Drive por cliente.
-- Se guarda la URL web de la carpeta de Drive creada durante el onboarding.

alter table public.clients
  add column if not exists drive_folder_url text;

comment on column public.clients.drive_folder_url is
  'URL web de la carpeta de Google Drive del cliente (creada al asignar su primer servicio).';
