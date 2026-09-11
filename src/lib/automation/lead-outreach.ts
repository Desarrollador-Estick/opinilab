import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { sendEmail } from "@/lib/email/send"
import {
  coldLeadEmail,
  followUpEmail,
  finalFollowUpEmail,
} from "@/lib/email/templates"
import { getDbEmailTemplate } from "@/lib/email/db-templates"
import { AUTOMATION_EMAILS_DEFAULT } from "@/app/api/settings/automations/route"

export const OUTREACH_TEMPLATES = ["outbound_1", "followup_1", "followup_2"]

export interface OutreachLog {
  action: string
  details: string
  timestamp: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function getAutomationEmailsConfig(
  supabase: SupabaseClient<Database>
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "automation_emails_config")
    .maybeSingle()
  const stored =
    data?.value && typeof data.value === "object"
      ? (data.value as Record<string, unknown>)
      : {}
  return { ...AUTOMATION_EMAILS_DEFAULT, ...stored }
}

// Auto-contacto de leads del scraper por email. El primer toque usa outbound_1;
// los siguientes rotan followup_1 → followup_2 y la secuencia se detiene.
// Solo se envía si `lead_auto_outreach_enabled` está activado.
export async function autoLeadOutreach(
  supabase: SupabaseClient<Database>,
  cfg: Record<string, unknown>,
  now: Date,
  logs: OutreachLog[]
): Promise<void> {
  const startOfDay = new Date(now.toDateString()).toISOString()
  const outreachNextDays = Math.max(Number(cfg.lead_outreach_next_days as number) || 7, 1)
  const leadVars = (lead: { contact_name: string | null; business_name: string }) => ({
    name: lead.contact_name || lead.business_name,
    business: lead.business_name,
    company: process.env.COMPANY_NAME || "OpiniLab",
  })

  // 1) Primer toque en frío: leads recién captados por el scraper (status new)
  //    con email. Corre tanto desde el cron 09:00 como justo después de que el
  //    scraper capture un lead con email o se lo encuentre en el seguimiento,
  //    para que la campaña arranque automáticamente nada más haber un email.
  if (cfg.lead_auto_outreach_enabled) {
    const { data: coldLeads } = await supabase
      .from("leads")
      .select("id, contact_name, business_name, email")
      .eq("source", "auto_scraped")
      .eq("status", "new")
      .not("email", "is", null)
      .limit(100)

    if (coldLeads) {
      for (const lead of coldLeads) {
        // Evitar reenviar a contactos ya tocados por cualquier campaña
        const { data: prior } = await supabase
          .from("email_sends")
          .select("id")
          .eq("to", lead.email)
          .in("template", [...OUTREACH_TEMPLATES, "lead_contact", "followUp", "promo_1"])
          .limit(1)

        if (prior && prior.length > 0) {
          // Ya se le escribió antes: solo promocionar el estado si sigue en "new"
          await supabase
            .from("leads")
            .update({ status: "contacted", updated_at: now.toISOString() })
            .eq("id", lead.id)
          continue
        }

        try {
          const tplDb = await getDbEmailTemplate(supabase, "outbound_1", leadVars(lead))
          const fallback = coldLeadEmail(
            lead.contact_name || lead.business_name,
            lead.business_name
          )
          const emailResult = await sendEmail({
            to: lead.email,
            template: "outbound_1",
            subject: tplDb ? tplDb.subject : fallback.subject,
            html: tplDb ? tplDb.body : fallback.html,
            leadId: lead.id,
            data: {
              leadName: lead.contact_name || lead.business_name,
              businessName: lead.business_name,
            },
            promotional: true,
          })

          if (emailResult.skipped) {
            // Dado de baja: se marca como contactado sin más seguimiento.
            await supabase
              .from("leads")
              .update({
                status: "contacted",
                next_follow_up_at: null,
                updated_at: now.toISOString(),
              })
              .eq("id", lead.id)
          } else if (emailResult.ok) {
            await supabase
              .from("leads")
              .update({
                status: "contacted",
                next_follow_up_at: new Date(now.getTime() + outreachNextDays * DAY_MS).toISOString(),
                last_contact_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", lead.id)
          }

          logs.push({
            action: "lead_outbound",
            details: `Primer contacto con ${lead.business_name} (${lead.email}). Result: ${emailResult.skipped ? "skipped" : emailResult.ok ? "success" : "failed"}`,
            timestamp: now.toISOString(),
          })
        } catch (err) {
          logs.push({
            action: "lead_outbound_error",
            details: `Fallo al contactar a ${lead.business_name}: ${err instanceof Error ? err.message : "unknown"}`,
            timestamp: now.toISOString(),
          })
        }
      }
    }
  }

  // 2) Seguimiento rotativo: leads ya contactados con next_follow_up_at vencido
  const { data: followUpLeads } = await supabase
    .from("leads")
    .select("id, contact_name, business_name, email, next_follow_up_at, status")
    .in("status", ["contacted", "interested", "proposal_sent", "negotiation"])
    .lte("next_follow_up_at", now.toISOString())
    .not("email", "is", null)
    .limit(100)

  if (followUpLeads) {
    for (const lead of followUpLeads) {
      // No enviar dos toques el mismo día
      const { data: sentToday } = await supabase
        .from("email_sends")
        .select("id")
        .eq("to", lead.email)
        .in("template", OUTREACH_TEMPLATES)
        .gte("created_at", startOfDay)
        .limit(1)
      if (sentToday && sentToday.length > 0) continue

      // Contar toques previos (90 días) para elegir la plantilla correcta
      const since = new Date(now.getTime() - 90 * DAY_MS).toISOString()
      const { data: priorSends } = await supabase
        .from("email_sends")
        .select("template")
        .eq("to", lead.email)
        .in("template", OUTREACH_TEMPLATES)
        .gte("created_at", since)
        .limit(50)
      const sentCount = priorSends?.length ?? 0

      let tplKey: string | null = null
      if (sentCount <= 0) tplKey = "outbound_1"
      else if (sentCount === 1) tplKey = "followup_1"
      else if (sentCount === 2) tplKey = "followup_2"
      else tplKey = null

      if (!tplKey) {
        await supabase
          .from("leads")
          .update({ next_follow_up_at: null, updated_at: now.toISOString() })
          .eq("id", lead.id)
        logs.push({
          action: "lead_outreach_stop",
          details: `${lead.business_name}: secuencia completada (${sentCount} toques)`,
          timestamp: now.toISOString(),
        })
        continue
      }

      try {
        const tplDb = await getDbEmailTemplate(supabase, tplKey, leadVars(lead))
        const fallback =
          tplKey === "followup_2"
            ? finalFollowUpEmail(lead.contact_name || lead.business_name, lead.business_name)
            : tplKey === "outbound_1"
              ? coldLeadEmail(lead.contact_name || lead.business_name, lead.business_name)
              : followUpEmail(lead.contact_name || lead.business_name, lead.business_name)
        const emailResult = await sendEmail({
          to: lead.email,
          template: tplKey,
          subject: tplDb ? tplDb.subject : fallback.subject,
          html: tplDb ? tplDb.body : fallback.html,
          leadId: lead.id,
          data: {
            leadName: lead.contact_name || lead.business_name,
            businessName: lead.business_name,
          },
          promotional: true,
        })

        if (emailResult.skipped) {
          // Dado de baja: se para la secuencia (no más toques).
          await supabase
            .from("leads")
            .update({ next_follow_up_at: null, updated_at: now.toISOString() })
            .eq("id", lead.id)
        } else if (emailResult.ok) {
          const next =
            tplKey === "followup_2"
              ? null
              : new Date(now.getTime() + outreachNextDays * DAY_MS).toISOString()
          await supabase
            .from("leads")
            .update({
              next_follow_up_at: next,
              last_contact_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", lead.id)
        }

        logs.push({
          action: "lead_follow_up",
          details: `Enviado ${tplKey} a ${lead.business_name} (${lead.email}). Result: ${emailResult.ok ? "success" : "failed"}`,
          timestamp: now.toISOString(),
        })
      } catch (err) {
        logs.push({
          action: "lead_follow_up_error",
          details: `Fallo al enviar ${tplKey} a ${lead.business_name}: ${err instanceof Error ? err.message : "unknown"}`,
          timestamp: now.toISOString(),
        })
      }
    }
  }
}