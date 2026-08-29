"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"

export type CreateClientAccountState = {
  error?: string
  success?: boolean
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

  // 2) El cliente debe existir.
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, business_name, contact_name")
    .eq("id", clientId)
    .maybeSingle()
  if (clientErr || !client) {
    return { error: clientErr?.message || "El cliente no existe." }
  }

  // 3) Si ya hay un profile vinculado a este cliente, avisamos.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("client_id", clientId)
    .maybeSingle()
  if (existingProfile) {
    return { error: `Este cliente ya tiene una cuenta vinculada (${existingProfile.email}).` }
  }

  // 4) Crear el usuario en Supabase Auth con service role (sin RLS).
  const admin = await createServerAdminClient()
  const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || client.contact_name || client.business_name },
  })
  if (createErr || !createdUser?.user) {
    if (createErr?.code === "user_already_exists") {
      return { error: `El email ${email} ya está registrado. Usa otro o borra esa cuenta.` }
    }
    return { error: createErr?.message || "Error al crear el usuario." }
  }

  // 5) Crear el perfil del cliente (rol client + client_id).
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
    return { error: `No se pudo crear el perfil: ${profileErr.message}` }
  }

  revalidatePath(`/dashboard/clientes/${clientId}`)
  revalidatePath("/dashboard/clientes")
  return { success: true }
}
