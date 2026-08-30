"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClientRecord } from "@/lib/supabase/queries"
import { provisionClientAccess } from "@/app/dashboard/clientes/account-actions"
import { sendClientCredentialsEmail } from "@/lib/email/client-credentials"
import type { Tables } from "@/types/database"

export type ConvertLeadResult = {
  ok: boolean
  clientId?: string
  accountCreated?: boolean
  error?: string
}

/**
 * Convierte un lead en cliente y, si tiene email, crea automáticamente su acceso
 * al portal con una contraseña temporal aleatoria que se envía por email.
 */
export async function convertLeadToClientAction(leadId: string): Promise<ConvertLeadResult> {
  if (!leadId) {
    return { ok: false, error: "Falta el lead." }
  }

  const supabase = await createClient()

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, business_name, contact_name, email, phone, website, city, industry, source, notes")
    .eq("id", leadId)
    .maybeSingle()
  if (leadErr || !lead) {
    return { ok: false, error: leadErr?.message || "No se encontró el lead." }
  }

  const clientData: Tables["clients"]["Insert"] = {
    business_name: lead.business_name,
    contact_name: lead.contact_name || "",
    email: lead.email || "",
    phone: lead.phone,
    website: lead.website,
    city: lead.city,
    industry: lead.industry,
    lead_source: lead.source,
    notes: lead.notes,
    status: "active" as Tables["clients"]["Insert"]["status"],
  }

  const { data: client, error: insertErr } = await createClientRecord(supabase, clientData)
  if (insertErr || !client) {
    return { ok: false, error: insertErr?.message || "No se pudo crear el cliente." }
  }

  let accountCreated = false
  if (client.id && lead.email) {
    const provision = await provisionClientAccess({
      clientId: client.id,
      email: lead.email,
      fullName: lead.contact_name || lead.business_name,
    })
    if (provision.ok) {
      accountCreated = true
      if (provision.temporaryPassword) {
        await sendClientCredentialsEmail({
          email: lead.email,
          temporaryPassword: provision.temporaryPassword,
          fullName: lead.contact_name || lead.business_name,
          clientId: client.id,
        })
      }
    }
  }

  await supabase
    .from("leads")
    .update({
      status: "won",
      converted_client_id: client.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  revalidatePath(`/dashboard/leads/${leadId}`)
  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/clientes")

  return { ok: true, clientId: client.id, accountCreated }
}
