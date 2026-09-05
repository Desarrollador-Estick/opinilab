import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { isCronRequestAuthorized, unauthorizedResponse } from "@/lib/cron-auth"
import { sendEmail } from "@/lib/email/send"
import {
  paymentReminder,
  followUpEmail,
  reviewRequestAuto,
  adminReviewDraft,
  reportNotification,
} from "@/lib/email/templates"
import { groqChat } from "@/lib/ai/groq"
import { buildReviewResponsePrompt } from "@/lib/ai/review-prompt"
import { getDbEmailTemplate } from "@/lib/email/db-templates"
import { AUTOMATION_EMAILS_DEFAULT } from "@/app/api/settings/automations/route"

interface AutomationLog {
  action: string
  details: string
  timestamp: string
}

const DAY_MS = 24 * 60 * 60 * 1000

async function getAutomationEmailsConfig(supabase: any) {
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

function formatPeriod(start?: string | null, end?: string | null): string {
  const s = start ? new Date(start) : null
  if (s && !Number.isNaN(s.getTime())) {
    const label = s.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return end || ""
}

async function hasPaymentReminderBlockers(
  supabase: any,
  clientId: string,
  now: Date
): Promise<boolean> {
  const { data: blockers } = await supabase
    .from("invoices")
    .select("id")
    .or(`status.eq.overdue,and(status.eq.sent,due_date.lt.${now.toISOString()})`)
    .eq("client_id", clientId)
    .limit(1)
  return !!blockers && blockers.length > 0
}

async function clientQualifiesForReviewRequest(
  supabase: any,
  client: any,
  cfg: Record<string, unknown>,
  now: Date
): Promise<{ ok: boolean; reason: string }> {
  const freqDays = Math.max(Number(cfg.review_request_frequency_days) || 90, 1)
  const freqCutoff = new Date(now.getTime() - freqDays * DAY_MS).toISOString()

  const { data: prior } = await supabase
    .from("email_sends")
    .select("id")
    .eq("template", "reviewRequestAuto")
    .eq("to", client.email)
    .gte("created_at", freqCutoff)
    .limit(1)
  if (prior && prior.length > 0) {
    return { ok: false, reason: "ya solicitada en los últimos días" }
  }

  if (cfg.review_request_after_payment) {
    const payCutoff = new Date(now.getTime() - 7 * DAY_MS).toISOString()
    const { data: recentPaid } = await supabase
      .from("invoices")
      .select("id")
      .eq("client_id", client.id)
      .eq("status", "paid")
      .gte("paid_at", payCutoff)
      .limit(1)
    if (recentPaid && recentPaid.length > 0) {
      return { ok: true, reason: "pago reciente" }
    }
  }

  const signupDays = Math.max(Number(cfg.review_request_days_after_signup) || 0, 0)
  if (signupDays > 0) {
    const signupCutoff = new Date(now.getTime() - signupDays * DAY_MS).toISOString()
    if (client.created_at && client.created_at <= signupCutoff) {
      return { ok: true, reason: "cliente con alta consolidada" }
    }
  }

  return { ok: false, reason: "sin condición activa (pago reciente o días desde el alta)" }
}

async function autoSendMonthlyReports(
  supabase: any,
  cfg: Record<string, unknown>,
  now: Date,
  logs: AutomationLog[]
) {
  const delayHours = Math.max(Number(cfg.report_send_delay_hours) || 0, 0)
  const cutoff = new Date(now.getTime() - delayHours * 60 * 60 * 1000).toISOString()

  const { data: generatedReports } = await supabase
    .from("reports")
    .select(
      "id, client_id, period_start, period_end, created_at, clients(business_name, email)"
    )
    .eq("report_type", "monthly")
    .eq("status", "generated")
    .lte("created_at", cutoff)
    .not("client_id", "is", null)

  if (!generatedReports || generatedReports.length === 0) return

  for (const report of generatedReports) {
    const client = report.clients
    if (!client?.email) {
      logs.push({
        action: "report_auto_skip",
        details: `Report ${report.id}: cliente sin email`,
        timestamp: now.toISOString(),
      })
      continue
    }

    if (await hasPaymentReminderBlockers(supabase, report.client_id, now)) {
      logs.push({
        action: "report_auto_skip",
        details: `Report ${report.id} (${client.business_name}): cliente no está al día`,
        timestamp: now.toISOString(),
      })
      continue
    }

    if (cfg.report_send_only_if_paid && report.period_start) {
      const { data: paidInPeriod } = await supabase
        .from("invoices")
        .select("id")
        .eq("client_id", report.client_id)
        .eq("status", "paid")
        .gte("paid_at", report.period_start)
        .lte("paid_at", report.period_end || report.period_start)
        .limit(1)
      if (!paidInPeriod || paidInPeriod.length === 0) {
        logs.push({
          action: "report_auto_skip",
          details: `Report ${report.id} (${client.business_name}): sin pago del periodo`,
          timestamp: now.toISOString(),
        })
        continue
      }
    }

    // Deduplicación: no reenviar informes ya autoenviados
    const monthAgo = new Date(now.getTime() - 35 * DAY_MS).toISOString()
    const { data: already } = await supabase
      .from("email_sends")
      .select("id")
      .eq("template", "reportAuto")
      .eq("to", client.email)
      .gte("created_at", monthAgo)
      .limit(1)
    if (already && already.length > 0) continue

    const periodLabel = formatPeriod(report.period_start, report.period_end)
    const tpl = reportNotification(client.business_name, client.business_name, periodLabel)
    const emailResult = await sendEmail({
      to: client.email,
      template: "reportAuto",
      subject: tpl.subject,
      html: tpl.html,
      clientId: report.client_id,
      data: {
        reportId: report.id,
        businessName: client.business_name,
        period: periodLabel,
      },
    })

    if (emailResult.ok) {
      await supabase.from("reports").update({ status: "sent" }).eq("id", report.id)
    }

    logs.push({
      action: "report_auto_send",
      details: `Informe de ${client.business_name} (${periodLabel}) a ${client.email}. Result: ${emailResult.ok ? "success" : "failed"}`,
      timestamp: now.toISOString(),
    })
  }
}

async function autoSendReviewRequests(
  supabase: any,
  cfg: Record<string, unknown>,
  now: Date,
  logs: AutomationLog[]
) {
  const { data: activeClients } = await supabase
    .from("clients")
    .select("id, business_name, contact_name, email, google_maps_url, created_at")
    .eq("status", "active")
    .not("email", "is", null)

  if (!activeClients || activeClients.length === 0) return

  for (const client of activeClients) {
    const qualify = await clientQualifiesForReviewRequest(supabase, client, cfg, now)
    if (!qualify.ok) {
      logs.push({
        action: "review_request_skip",
        details: `${client.business_name}: ${qualify.reason}`,
        timestamp: now.toISOString(),
      })
      continue
    }

    try {
      const tpl = reviewRequestAuto(
        client.contact_name || client.business_name,
        client.business_name,
        client.google_maps_url || null
      )
      const emailResult = await sendEmail({
        to: client.email,
        template: "reviewRequestAuto",
        subject: tpl.subject,
        html: tpl.html,
        clientId: client.id,
        data: {
          businessName: client.business_name,
          reviewUrl: client.google_maps_url || null,
        },
      })
      logs.push({
        action: "review_request",
        details: `Solicitud de reseña a ${client.business_name} (${client.email}). Result: ${emailResult.ok ? "success" : "failed"}`,
        timestamp: now.toISOString(),
      })
    } catch (err) {
      logs.push({
        action: "review_request_error",
        details: `Fallo al solicitar reseña a ${client.business_name}: ${err instanceof Error ? err.message : "unknown"}`,
        timestamp: now.toISOString(),
      })
    }
  }
}

async function autoDraftReviewResponses(
  supabase: any,
  cfg: Record<string, unknown>,
  now: Date,
  logs: AutomationLog[]
) {
  const { data: pendingReviews } = await supabase
    .from("reviews")
    .select(
      "id, client_id, platform, reviewer_name, rating, review_text, clients(business_name)"
    )
    .eq("status", "new")
    .is("response_text", null)

  if (!pendingReviews || pendingReviews.length === 0) return

  const { data: companySettings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["company_email"])
  const adminEmail =
    process.env.ADMIN_EMAIL ||
    String(companySettings?.find((s: any) => s.key === "company_email")?.value || "") ||
    ""
  const notifyAdmin = Boolean(cfg.review_auto_response_notify_admin) && Boolean(adminEmail)

  for (const review of pendingReviews) {
    try {
      const businessName = review.clients?.business_name ?? "tu negocio"
      const rating = review.rating ?? 0
      const reviewer = review.reviewer_name ?? "nuestro cliente"
      const reviewText = review.review_text ?? ""
      const prompt = buildReviewResponsePrompt(businessName, rating, reviewer, reviewText)
      const draft = await groqChat(
        [
          {
            role: "system",
            content: "Eres un redactor de marketing experto en gestionar reputación online.",
          },
          { role: "user", content: prompt },
        ],
        {
          model: "qwen/qwen3.8-27b",
          temperature: 0.7,
          maxTokens: 250,
          usage: { category: "review_auto", clientId: review.client_id },
        }
      )

      await supabase
        .from("reviews")
        .update({ response_text: draft })
        .eq("id", review.id)

      if (notifyAdmin) {
        const tpl = adminReviewDraft(businessName, reviewer, draft)
        await sendEmail({
          to: adminEmail,
          template: "adminReviewDraft",
          subject: tpl.subject,
          html: tpl.html,
          clientId: review.client_id,
          data: { businessName, reviewerName: reviewer, draft },
        })
      }

      logs.push({
        action: "review_ai_draft",
        details: `Borrador IA para reseña de ${reviewer} (${businessName}), plataforma ${review.platform}.${notifyAdmin ? " Notificado admin." : ""}`,
        timestamp: now.toISOString(),
      })
    } catch (err) {
      logs.push({
        action: "review_ai_draft_error",
        details: `Fallo al generar borrador de reseña ${review.id}: ${err instanceof Error ? err.message : "unknown"}`,
        timestamp: now.toISOString(),
      })
    }
  }
}

export async function GET(request: Request) {
  const logs: AutomationLog[] = []
  const now = new Date()

  if (!isCronRequestAuthorized(request)) {
    return unauthorizedResponse()
  }

  try {
    // El cron de Vercel no tiene sesión de usuario: usamos service role (omite
    // RLS) cuando está configurada; si no, el cliente de servidor.
    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await createClient()

    // 1. Check overdue invoices → send reminders
    const { data: overdueInvoices } = await supabase
      .from("invoices")
      .select("id, client_id, invoice_number, total, due_date, clients(business_name, email)")
      .eq("status", "sent")
      .lt("due_date", now.toISOString())

    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const invoice of overdueInvoices) {
        const overdueDays = Math.floor(
          (now.getTime() - (invoice.due_date ? new Date(invoice.due_date).getTime() : now.getTime())) / (1000 * 60 * 60 * 24)
        )

        // Check if we already sent a reminder today
        const { data: existingReminder } = await supabase
          .from("email_sends")
          .select("id")
          .eq("template", "paymentReminder")
          .eq("to", invoice.clients?.email)
          .gte("created_at", new Date(now.toDateString()).toISOString())
          .limit(1)

        if (existingReminder && existingReminder.length > 0) {
          continue
        }

        if (invoice.clients?.email) {
          try {
            const reminder = paymentReminder(
              invoice.invoice_number,
              Number(invoice.total),
              overdueDays,
              invoice.clients?.business_name || "cliente"
            )
            const emailResult = await sendEmail({
              to: invoice.clients.email,
              template: "paymentReminder",
              subject: reminder.subject,
              html: reminder.html,
              clientId: invoice.client_id,
              data: {
                invoiceNumber: invoice.invoice_number,
                total: Number(invoice.total),
                daysOverdue: overdueDays,
                clientName: invoice.clients?.business_name || "cliente",
              },
            })

            logs.push({
              action: "invoice_reminder",
              details: `Sent reminder for ${invoice.invoice_number} to ${invoice.clients.email} (${overdueDays} days overdue). Result: ${emailResult.ok ? "success" : "failed"}`,
              timestamp: now.toISOString(),
            })
          } catch (err) {
            logs.push({
              action: "invoice_reminder_error",
              details: `Failed to send reminder for ${invoice.invoice_number}: ${err instanceof Error ? err.message : "unknown"}`,
              timestamp: now.toISOString(),
            })
          }
        } else {
          logs.push({
            action: "invoice_reminder_skip",
            details: `Skipped reminder for ${invoice.invoice_number}: no email address`,
            timestamp: now.toISOString(),
          })
        }
      }
    }

    // 2. Check leads needing follow-up
    const { data: followUpLeads } = await supabase
      .from("leads")
      .select("id, contact_name, business_name, email, next_follow_up_at, status")
      .in("status", ["contacted", "interested", "proposal_sent", "negotiation"])
      .lte("next_follow_up_at", now.toISOString())
      .not("email", "is", null)

    if (followUpLeads && followUpLeads.length > 0) {
      for (const lead of followUpLeads) {
        // Check if we already sent a follow-up today
        const { data: existingFollowUp } = await supabase
          .from("email_sends")
          .select("id")
          .eq("template", "followUp")
          .eq("to", lead.email)
          .gte("created_at", new Date(now.toDateString()).toISOString())
          .limit(1)

        if (existingFollowUp && existingFollowUp.length > 0) {
          continue
        }

        try {
          const tplDb = await getDbEmailTemplate(supabase, "followup_1", {
            name: lead.contact_name || lead.business_name,
            business: lead.business_name,
            company: process.env.COMPANY_NAME || "Agencia Marketing",
          })
          const fallback = followUpEmail(
            lead.contact_name || lead.business_name,
            lead.business_name
          )
          const emailResult = await sendEmail({
            to: lead.email,
            template: tplDb ? "followup_1" : "followUp",
            subject: tplDb ? tplDb.subject : fallback.subject,
            html: tplDb ? tplDb.body : fallback.html,
            leadId: lead.id,
            data: {
              leadName: lead.contact_name || lead.business_name,
              businessName: lead.business_name,
            },
          })

          // Update next_follow_up_at to 7 days from now
          const nextFollowUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          await supabase
            .from("leads")
            .update({
              next_follow_up_at: nextFollowUp.toISOString(),
              last_contact_at: now.toISOString(),
            })
            .eq("id", lead.id)

          logs.push({
            action: "lead_follow_up",
            details: `Sent follow-up to ${lead.business_name} (${lead.email}). Result: ${emailResult.ok ? "success" : "failed"}`,
            timestamp: now.toISOString(),
          })
        } catch (err) {
          logs.push({
            action: "lead_follow_up_error",
            details: `Failed to send follow-up for ${lead.business_name}: ${err instanceof Error ? err.message : "unknown"}`,
            timestamp: now.toISOString(),
          })
        }
      }
    }

    // 3. Check for monthly report generation (1st of month)
    if (now.getDate() === 1) {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const periodStart = firstOfMonth.toISOString().split("T")[0]
      const periodEnd = lastDayOfPrevMonth.toISOString().split("T")[0]

      const { data: activeClients } = await supabase
        .from("clients")
        .select("id, business_name, email")
        .eq("status", "active")

      if (activeClients && activeClients.length > 0) {
        for (const client of activeClients) {
          // Check if report already exists for this period
          const { data: existing } = await supabase
            .from("reports")
            .select("id")
            .eq("client_id", client.id)
            .eq("report_type", "monthly")
            .eq("period_start", periodStart)
            .limit(1)

          if (existing && existing.length > 0) continue

          try {
            const reportRes = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "https://opinilab.com"}/api/reports`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  client_id: client.id,
                  report_type: "monthly",
                  period_start: periodStart,
                  period_end: periodEnd,
                }),
              }
            )
            const reportResult = await reportRes.json()

            logs.push({
              action: "monthly_report",
              details: `Generated monthly report for ${client.business_name}. Result: ${reportResult.success ? "success" : "failed"}`,
              timestamp: now.toISOString(),
            })
          } catch (err) {
            logs.push({
              action: "monthly_report_error",
              details: `Failed to generate report for ${client.business_name}: ${err instanceof Error ? err.message : "unknown"}`,
              timestamp: now.toISOString(),
            })
          }
        }
      }
    }

    // 4. Automatizaciones configuradas (informes auto, solicitudes de reseñas, borradores IA)
    const automationConfig = await getAutomationEmailsConfig(supabase)

    if (automationConfig.report_auto_send_enabled) {
      await autoSendMonthlyReports(supabase, automationConfig, now, logs)
    }

    if (automationConfig.review_request_enabled) {
      await autoSendReviewRequests(supabase, automationConfig, now, logs)
    }

    if (automationConfig.review_auto_response_enabled) {
      await autoDraftReviewResponses(supabase, automationConfig, now, logs)
    }

    // 5. Log all automation actions
    if (logs.length > 0) {
      await supabase.from("automation_logs").insert(
        logs.map((log) => ({
          action: log.action,
          details: log.details,
          created_at: log.timestamp,
        }))
      )
    }

    return NextResponse.json({
      success: true,
      executed_at: now.toISOString(),
      actions_performed: logs.length,
      logs,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error",
        executed_at: now.toISOString(),
      },
      { status: 500 }
    )
  }
}
