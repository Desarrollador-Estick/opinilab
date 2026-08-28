import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/types/database"

// Cliente de Supabase con la "service role key". Omiten RLS, por lo que puede
// escribir en cualquier tabla SIN sesión de usuario. Imprescindible para
// operaciones de servidor a servidor (p.ej. webhooks de Stripe), donde no hay
// cookies de un usuario autenticado.
//
// IMPORTANTE: nunca usar esta clave en el cliente (navegador). Solo en rutas
// API del servidor y únicamente si SERVICE_ROLE_KEY está configurada.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isServiceRoleConfigured(): boolean {
  return Boolean(serviceRoleKey)
}

export async function createServerAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
