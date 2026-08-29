"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClientRecord, updateClient, deleteClient } from "@/lib/supabase/queries"
import { sendEmail } from "@/lib/email/send"
import { provisionClientAccess, derivePasswordFromNif } from "./account-actions"
import { Database } from "@/types/database"

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"]
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"]

export type CreateClientState = {
  error?: string
  success?: boolean
  accountCreated?: boolean
  email?: string
  generatedPassword?: string
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
  let generatedPassword: string | undefined
  let accountNotice: string | undefined

  // Crear automáticamente el acceso del cliente con email + NIF.
  if (created?.id && data.email) {
    const password = derivePasswordFromNif(data.nif_cif)
    if (password) {
      const provision = await provisionClientAccess({
        clientId: created.id,
        email: data.email,
        password,
        fullName: data.contact_name || data.business_name,
      })
      if (provision.ok) {
        accountCreated = true
        generatedPassword = password
        // Enviar credenciales por email (nunca rompe el flujo).
        await sendEmail({
          to: data.email,
          template: "client-welcome",
          subject: "Tus credenciales de acceso al portal de OpiniLab",
          clientId: created.id,
          html: welcomeEmailHtml({
            businessName: data.contact_name || data.business_name,
            email: data.email,
            password,
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/portal/login`,
          }),
        })
      } else {
        accountNotice = provision.error
      }
    } else {
      accountNotice =
        "El cliente se creó, pero no se pudo generar la contraseña (NIF/DNI sin letra final). Crea el acceso manualmente desde la ficha del cliente."
    }
  }

  revalidatePath("/dashboard/clientes")

  if (accountCreated) {
    revalidatePath(`/dashboard/clientes/${created!.id}`)
    return {
      success: true,
      accountCreated: true,
      email: data.email,
      generatedPassword,
    }
  }

  return {
    success: true,
    accountNotice,
  }
}

function welcomeEmailHtml(opts: {
  businessName: string
  email: string
  password: string
  portalUrl: string
}) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827">
      <h2 style="margin:0 0 16px">Hola ${opts.businessName}</h2>
      <p style="line-height:1.6;margin:0 0 16px">
        Te damos la bienvenida al portal de cliente de <strong>OpiniLab</strong>.
        Desde aquí podrás consultar tu contrato, tus facturas (y pagarlas) y la evolución de tu cuenta.
      </p>
      <p style="line-height:1.6;margin:0 0 16px">Tus credenciales de acceso son:</p>
      <table style="border-collapse:collapse;margin:0 0 16px">
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280">Usuario</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">${opts.email}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280">Contraseña</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">${opts.password}</td>
        </tr>
      </table>
      <a href="${opts.portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Acceder al portal</a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Por seguridad, te recomendamos cambiar la contraseña tras el primer acceso.</p>
    </div>
  `
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
