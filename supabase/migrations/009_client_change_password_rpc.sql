-- ============================================================
-- Migración 009: RPC para que el cliente pueda completar el cambio
--               de contraseña sin escalar privilegios (seguridad)
--
-- PROBLEMA: `changePasswordAction` hacía
--   supabase.from("profiles").update({ must_change_password: false })
-- con RLS activo y, en producción, la política de UPDATE solo existe
-- para roles de agencia. El cliente autenticado NO tiene policy UPDATE
-- sobre su propia fila, así que PostgREST devolvía 200 con 0 filas
-- cambiadas (sin error), el flag seguía en `true` y el middleware
-- reenviaba al cliente a /portal/cambiar-password en bucle.
--
-- SOLUCIÓN: función `security definer` que SOLO pone a `false` el
-- flag `must_change_password` de la fila del usuario autenticado.
-- El cliente nunca puede actualizar role / client_id / email / etc.
-- ============================================================

create or replace function public.complete_password_change()
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set must_change_password = false
   where id = auth.uid()
  returning true
$$;

-- Otorgar al rol autenticado permiso para ejecutarla.
grant execute on function public.complete_password_change() to authenticated;