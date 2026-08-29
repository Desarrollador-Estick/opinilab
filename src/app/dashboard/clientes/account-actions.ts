"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { generateTemporaryPassword } from "@/lib/nif-password"
import { sendClientCredentialsEmail } from "@/lib/email/client-credentials"

export type CreateClientAccountState = {
  error?: string
  success?: boolean
}

export type ProvisionResult = {
  ok: boolean
  error?: string
  /** Contraseña temporal asignada (solo si ok=true) para enviarla por email. */
  temporaryPassword?: string
}

/**
 * Crea el usuario en Supabase Auth (service role, sin RLS) y su perfil
 * con rol 'client' vinculado al cliente. Le asigna una CONTRASEÑA TEMPORAL
 * ALEATORIA y marca `must_change_password = true` para que la primera vez
 * tenga que cambiarla. Devuelve {ok:false} con `error` si ya existe una
 * cuenta o algo falla; si ok=true devuelve `temporaryPassword`.
 * Limpia el auth user si el perfil no se crea.
 */
export async function provisionClientAccess(opts: {
  clientId: string
  email: string
  fullName?: string
}): Promise<ProvisionResult> {
  const { clientId, email, fullName } = opts

  if (!clientId || !email) {
    return { ok: false, error: "Faltan datos (cliente o email)." }
  }

  // 1) El cliente debe existir.
  const supabase = await createClient()
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, business_name, contact_name")
    .eq("id", clientId)
    .maybeSingle()
  if (clientErr || !client) {
    return { ok: false, error: clientErr?.message || "El cliente no existe." }
  }

  // 2) Si ya hay un profile vinculado a este cliente, avisamos.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("client_id", clientId)
    .maybeSingle()
  if (existingProfile) {
    return { ok: false, error: `Este cliente ya tiene una cuenta vinculada (${existingProfile.email}).` }
  }

  const temporaryPassword = generateTemporaryPassword()

  // 3) Crear el usuario en Supabase Auth con service role (sin RLS).
  const admin = await createServerAdminClient()
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName || client.contact_name || client.business_name },
  })
  if (createErr || !createdUser?.user) {
    if (createErr?.code === "user_already_exists") {
      return { ok: false, error: `El email ${email} ya está registrado. Usa otro o borra esa cuenta.` }
    }
    return { ok: false, error: createErr?.message || "Error al crear el usuario." }
  }

  // 4) Crear el perfil del cliente (rol client + client_id + primero debe cambiar la contraseña).
  const { error: profileErr } = await admin
    .from("profiles")
    .insert({
      id: createdUser.user.id,
      email,
      full_name: fullName || client.contact_name || client.business_name,
      role: "client",
      client_id: clientId,
      must_change_password: true,
    })
  if (profileErr) {
    // Limpieza: si falla el perfil, borramos el auth user para no dejar huérfanos.
    await admin.auth.admin.deleteUser(createdUser.user.id)
    return { ok: false, error: `No se pudo crear el perfil: ${profileErr.message}` }
  }

  return { ok: true, temporaryPassword }
}

export async function createClientAccountAction(
  prevState: CreateClientAccountState,
  formData: FormData
): Promise<CreateClientAccountState> {
  const clientId = formData.get("client_id") as string
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const fullName = (formData.get("full_name") as string)?.trim()

  if (!clientId || !email) {
    return { error: "Faltan datos (cliente o email)." }
  }

  // 1) Solo un rol de agencia (admin) puede crear cuentas de cliente.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle()
  const myRole = me?.role
  if (!["admin", "manager", "member"].includes(myRole ?? "")) {
    return { error: "No tienes permisos para crear cuentas de cliente." }
  }

  const result = await provisionClientAccess({
    clientId,
    email,
    fullName,
  })
  if (!result.ok) {
    return { error: result.error }
  }

  // Enviar al cliente sus credenciales temporales por email (nunca rompe el flujo).
  if (result.temporaryPassword) {
    await sendClientCredentialsEmail({
      email,
      temporaryPassword: result.temporaryPassword,
      fullName,
      clientId,
    })
  }

  revalidatePath(`/dashboard/clientes/${clientId}`)
  revalidatePath("/dashboard/clientes")
  return { success: true }
}
