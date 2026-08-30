"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClientRecord, updateClient, deleteClient } from "@/lib/supabase/queries"
import { provisionClientAccess } from "./account-actions"
import { sendClientCredentialsEmail } from "@/lib/email/client-credentials"
import { Database } from "@/types/database"

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"]
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"]

export type CreateClientState = {
  error?: string
  success?: boolean
  accountCreated?: boolean
  email?: string
  accountNotice?: string
}

export async function createClientAction(
  prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const supabase = await createClient()

  const data: ClientInsert = {
    business_name: formData.get("business_name") as string,
    contact_name: formData.get("contact_name") as string,
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    province: (formData.get("province") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    nif_cif: (formData.get("nif_cif") as string) || null,
    industry: (formData.get("industry") as string) || null,
    google_maps_url: (formData.get("google_maps_url") as string) || null,
    monthly_budget: parseFloat(formData.get("monthly_budget") as string) || 0,
    lead_source: (formData.get("lead_source") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: (formData.get("status") as ClientInsert["status"]) || "active",
  }

  const { data: created, error } = await createClientRecord(supabase, data)

  if (error) {
    return { error: error.message }
  }

  let accountCreated = false
  let accountNotice: string | undefined

  // Crear automáticamente el acceso del cliente: contraseña temporal aleatoria.
  if (created?.id && data.email) {
    const provision = await provisionClientAccess({
      clientId: created.id,
      email: data.email,
      fullName: data.contact_name || data.business_name,
    })
    if (provision.ok) {
      accountCreated = true
      // Enviar credenciales temporales por email (nunca rompe el flujo).
      if (provision.temporaryPassword) {
        await sendClientCredentialsEmail({
          email: data.email,
          temporaryPassword: provision.temporaryPassword,
          fullName: data.contact_name || data.business_name,
          clientId: created.id,
        })
      }
    } else {
      accountNotice = provision.error
    }
  }

  revalidatePath("/dashboard/clientes")

  if (accountCreated) {
    revalidatePath(`/dashboard/clientes/${created!.id}`)
    return {
      success: true,
      accountCreated: true,
      email: data.email,
    }
  }

  return {
    success: true,
    accountNotice,
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = await createClient()

  const data: ClientUpdate = {
    business_name: formData.get("business_name") as string,
    contact_name: formData.get("contact_name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || null,
    website: (formData.get("website") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    province: (formData.get("province") as string) || null,
    postal_code: (formData.get("postal_code") as string) || null,
    nif_cif: (formData.get("nif_cif") as string) || null,
    industry: (formData.get("industry") as string) || null,
    google_maps_url: (formData.get("google_maps_url") as string) || null,
    monthly_budget: parseFloat(formData.get("monthly_budget") as string) || 0,
    lead_source: (formData.get("lead_source") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: (formData.get("status") as ClientUpdate["status"]),
  }

  const { error } = await updateClient(supabase, id, data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/clientes/${id}`)
  revalidatePath("/dashboard/clientes")
  redirect(`/dashboard/clientes/${id}`)
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()

  const { error } = await deleteClient(supabase, id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard/clientes")
  revalidatePath("/dashboard")
  redirect("/dashboard/clientes")
}

type ClientServiceInsert = Database["public"]["Tables"]["client_services"]["Insert"]
type ClientServiceUpdate = Database["public"]["Tables"]["client_services"]["Update"]

export type ClientServiceState = {
  error?: string
  success?: boolean
}

// Asigna un servicio del catálogo a un cliente (lo activa y registra la fecha de inicio).
export async function addClientServiceAction(
  clientId: string,
  serviceId: string
): Promise<ClientServiceState> {
  const supabase = await createClient()

  // Evitar duplicados: si ya existe la asignación, no la vuelve a crear.
  const { data: existing } = await supabase
    .from("client_services")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("service_id", serviceId)
    .maybeSingle()

  if (existing) {
    if (existing.status === "cancelled") {
      const { error } = await supabase
        .from("client_services")
        .update({ status: "active", end_date: null })
        .eq("id", existing.id)
      if (error) return { error: error.message }
      revalidatePath(`/dashboard/clientes/${clientId}`)
      return { success: true }
    }
    return { error: "El cliente ya tiene este servicio asignado" }
  }

  const data: ClientServiceInsert = {
    client_id: clientId,
    service_id: serviceId,
    status: "active",
    custom_price: null,
    start_date: new Date().toISOString(),
  }

  const { error } = await supabase.from("client_services").insert(data)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clientes/${clientId}`)
  return { success: true }
}

// Quita la asignación del servicio al cliente (borrado físico).
export async function removeClientServiceAction(
  clientServiceId: string
): Promise<ClientServiceState> {
  const supabase = await createClient()

  const { data: cs, error: fetchError } = await supabase
    .from("client_services")
    .select("client_id")
    .eq("id", clientServiceId)
    .single()
  if (fetchError || !cs) return { error: "Asignación no encontrada" }

  const { error } = await supabase
    .from("client_services")
    .delete()
    .eq("id", clientServiceId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clientes/${cs.client_id}`)
  return { success: true }
}

// Activa / pausa un servicio asignado a un cliente.
export async function toggleClientServiceStatusAction(
  clientServiceId: string,
  status: ClientServiceUpdate["status"]
): Promise<ClientServiceState> {
  const supabase = await createClient()

  const { data: cs, error: fetchError } = await supabase
    .from("client_services")
    .select("id, client_id, status")
    .eq("id", clientServiceId)
    .single()
  if (fetchError || !cs) return { error: "Asignación no encontrada" }

  const next =
    status === "active" ? "paused" : status === "paused" ? "active" : status

  const update: ClientServiceUpdate = { status: next }
  if (next === "active") update.end_date = null
  if (next === "paused") update.end_date = new Date().toISOString()

  const { error } = await supabase
    .from("client_services")
    .update(update)
    .eq("id", clientServiceId)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clientes/${cs.client_id}`)
  return { success: true }
}
