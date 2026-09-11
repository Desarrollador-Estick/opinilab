import type { SupabaseClient } from "@supabase/supabase-js"

export interface WipeResult {
  email_replies_deleted: number
  email_sends_deleted: number
  leads_anonymized: number
  suppressions_added: number
}

/**
 * Ejecuta el derecho de supresión/oposición de una persona a partir de su
 * email: elimina sus réplicas y registros de envío en los que aparece como
 * destinatario, anonimiza sus leads (no los elimina si comerciaron para no
 * romper la facturación) y la añade a la lista de bajas para que nunca más se
 * le envíe un email comercial.
 */
export async function wipePersonData(
  supabase: SupabaseClient,
  email: string
): Promise<WipeResult> {
  const normalized = (email || "").trim().toLowerCase()
  const result: WipeResult = {
    email_replies_deleted: 0,
    email_sends_deleted: 0,
    leads_anonymized: 0,
    suppressions_added: 0,
  }
  if (!normalized) return result

  const { data: replies } = await supabase
    .from("email_replies")
    .select("id")
    .ilike("email_from", normalized)
  if (replies && replies.length > 0) {
    await supabase
      .from("email_replies")
      .delete()
      .in(
        "id",
        replies.map((r) => r.id)
      )
    result.email_replies_deleted = replies.length
  }

  const { data: sends } = await supabase
    .from("email_sends")
    .select("id")
    .ilike("to", normalized)
  if (sends && sends.length > 0) {
    await supabase
      .from("email_sends")
      .delete()
      .in(
        "id",
        sends.map((s) => s.id)
      )
    result.email_sends_deleted = sends.length
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .ilike("email", normalized)
  if (leads && leads.length > 0) {
    await supabase
      .from("leads")
      .update({
        email: null,
        phone: null,
        contact_name: null,
        notes: null,
        social_media: null,
        next_follow_up_at: null,
        updated_at: new Date().toISOString(),
      })
      .in(
        "id",
        leads.map((l) => l.id)
      )
    result.leads_anonymized = leads.length
  }

  const { error: suppressError } = await supabase
    .from("email_suppressions")
    .insert({ email: normalized, source: "privacy_request" })
  if (!suppressError) result.suppressions_added = 1

  return result
}