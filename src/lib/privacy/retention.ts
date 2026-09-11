import type { SupabaseClient } from "@supabase/supabase-js"

export interface RetentionLog {
  action: string
  details: string
  timestamp: string
}

export interface RetentionResult {
  lead_anonymized: number
  page_events_purged: number
  email_sends_purged: number
  logs: RetentionLog[]
}

/**
 * Retención de datos (RGPD): anonimiza leads que ya no justifican el interés
 * legítimo (perdidos o contactados sin respuesta durante 120 días y en estado
 * no comercial) y purga eventos de navegación (>12 meses) y registros de email
 * (>24 meses) para no acumular PII indefinidamente.
 *
 * Se llama desde runAutomationFull (cron 09:00) y desde el dashboard.
 * Los leads que llegaron a cliente/conversión se conservan (obligación legal
 * y contractual de facturación).
 */
export async function runRetentionPurge(
  supabase: SupabaseClient,
  now = new Date(),
  logs: RetentionLog[] = []
): Promise<RetentionResult> {
  const result: RetentionResult = {
    lead_anonymized: 0,
    page_events_purged: 0,
    email_sends_purged: 0,
    logs,
  }
  const iso = now.toISOString()
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

  // 1. Leads perdidos sin actividad en 120 días → anonimizar PII.
  const lostCutoff = daysAgo(120)
  const { data: lostLeads, error: lostError } = await supabase
    .from("leads")
    .select("id")
    .in("status", ["lost"])
    .or(`last_contact_at.lt.${lostCutoff},last_contact_at.is.null`)
    .lt("created_at", lostCutoff)

  if (lostError) {
    logs.push({
      action: "privacy_retention",
      details: `Error consultando leads lost: ${lostError.message}`,
      timestamp: iso,
    })
  } else if (lostLeads && lostLeads.length > 0) {
    const ids = lostLeads.map((l) => l.id)
    const { error } = await supabase
      .from("leads")
      .update({
        email: null,
        phone: null,
        contact_name: null,
        notes: null,
        social_media: null,
        next_follow_up_at: null,
        updated_at: iso,
      })
      .in("id", ids)
    if (error) {
      logs.push({
        action: "privacy_retention",
        details: `Error anonimizando leads lost: ${error.message}`,
        timestamp: iso,
      })
    } else {
      result.lead_anonymized += ids.length
    }
  }

  // 2. Leads nunca convertidos sin respuesta tras el primer email en 120 días
  //    (new/contacted) → perderían el interés legítimo; se anonimizan igual.
  const contractCutoff = daysAgo(120)
  const { data: staleLeads, error: staleError } = await supabase
    .from("leads")
    .select("id")
    .in("status", ["new", "contacted"])
    .lt("created_at", contractCutoff)

  if (staleError) {
    logs.push({
      action: "privacy_retention",
      details: `Error consultando leads sin respuesta: ${staleError.message}`,
      timestamp: iso,
    })
  } else if (staleLeads && staleLeads.length > 0) {
    const ids = staleLeads.map((l) => l.id)
    const { error } = await supabase
      .from("leads")
      .update({
        email: null,
        phone: null,
        contact_name: null,
        notes: null,
        social_media: null,
        next_follow_up_at: null,
        updated_at: iso,
      })
      .in("id", ids)
    if (error) {
      logs.push({
        action: "privacy_retention",
        details: `Error anonimizando leads sin respuesta: ${error.message}`,
        timestamp: iso,
      })
    } else {
      result.lead_anonymized += ids.length
    }
  }

  // 3. Purga de navegación anónima + PII antigua.
  const { error: pageError } = await supabase
    .from("page_events")
    .delete()
    .lt("created_at", daysAgo(365))
  if (pageError) {
    logs.push({
      action: "privacy_retention",
      details: `Error purgando page_events: ${pageError.message}`,
      timestamp: iso,
    })
  } else {
    result.page_events_purged = 1
  }

  const { error: emailError } = await supabase
    .from("email_sends")
    .delete()
    .lt("created_at", daysAgo(730))
  if (emailError) {
    logs.push({
      action: "privacy_retention",
      details: `Error purgando email_sends: ${emailError.message}`,
      timestamp: iso,
    })
  } else {
    result.email_sends_purged = 1
  }

  logs.push({
    action: "privacy_retention",
    details: `Retención ejecutada: ${result.lead_anonymized} leads anonimizados, page_events y email_sends antiguos purgados.`,
    timestamp: iso,
  })

  return result
}