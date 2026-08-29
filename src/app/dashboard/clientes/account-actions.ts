"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"

export type CreateClientAccountState = {
  error?: string
  success?: boolean
}

/**
 * Deriva la contraseña de acceso del cliente a partir de su NIF/DNI:
 * las 5 últimas cifras + la letra final.
 * Ej: 12345678Z -> 45678Z
 * Devuelve null si no se puede derivar (sin letra final, vacío...).
 */
export function derivePasswordFromNif(nif: string | null | undefined): string | null {
  if (!nif) return null
  const cleaned = nif.replace(/\s+/g, "")
  if (cleaned.length === 0) return null

  // Último carácter (debe ser una letra para DNI/NIF de persona).
  const last = cleaned[cleaned.length - 1]
  const isLetterEnd = /[A-Za-z]/.test(last)

  // Los últimos 5 caracteres que sean dígitos o letras antes del final.
  const body = cleaned.slice(0, -1)
  const digits = [...body].filter((c) => /[0-9A-Za-z]/.test(c))
  const lastFive = digits.slice(-5).join("")

  if (!isLetterEnd) return null
  if (lastFive.length < 5) return null

  return `${lastFive}${last.toUpperCase()}`
}

export type ProvisionResult = {
  ok: boolean
  error?: string
}

/**
 * Crea el usuario en Supabase Auth (service role, sin RLS) y su perfil
 * con rol 'client' vinculado al cliente. Devuelve {ok:false} con `error`
 * si ya existe una cuenta o algo falla. Limpia el auth user si el perfil no se crea.
 */
export async function provisionClientAccess(opts: {
  clientId: string
  email: string
  password: string
  fullName?: string
}): Promise<ProvisionResult> {
  const { clientId, email, password, fullName } = opts

  if (!clientId || !email || !password) {
    return { ok: false, error: "Faltan datos (cliente, email o contraseña)." }
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." }
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

  // 3) Crear el usuario en Supabase Auth con service role (sin RLS).
  const admin = await createServerAdminClient()
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || client.contact_name || client.business_name },
  })
  if (createErr || !createdUser?.user) {
    if (createErr?.code === "user_already_exists") {
      return { ok: false, error: `El email ${email} ya está registrado. Usa otro o borra esa cuenta.` }
    }
    return { ok: false, error: createErr?.message || "Error al crear el usuario." }
  }

  // 4) Crear el perfil del cliente (rol client + client_id).
  const { error: profileErr } = await admin
    .from("profiles")
    .insert({
      id: createdUser.user.id,
      email,
      full_name: fullName || client.contact_name || client.business_name,
      role: "client",
      client_id: clientId,
    })
  if (profileErr) {
    // Limpieza: si falla el perfil, borramos el auth user para no dejar huérfanos.
    await admin.auth.admin.deleteUser(createdUser.user.id)
    return { ok: false, error: `No se pudo crear el perfil: ${profileErr.message}` }
  }

  return { ok: true }
}

export async function createClientAccountAction(
  prevState: CreateClientAccountState,
  formData: FormData
): Promise<CreateClientAccountState> {
  const clientId = formData.get("client_id") as string
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const fullName = (formData.get("full_name") as string)?.trim()

  if (!clientId || !email || !password) {
    return { error: "Faltan datos (cliente, email o contraseña)." }
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." }
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
    password,
    fullName,
  })
  if (!result.ok) {
    return { error: result.error }
  }

  revalidatePath(`/dashboard/clientes/${clientId}`)
  revalidatePath("/dashboard/clientes")
  return { success: true }
}
