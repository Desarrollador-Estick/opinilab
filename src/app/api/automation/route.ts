import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

interface AutomationLog {
  action: string
  details: string
  timestamp: string
}

export async function GET() {
  const logs: AutomationLog[] = []
  const now = new Date()

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
          .eq("template", "reminder")
          .eq("to", invoice.clients?.email)
          .gte("created_at", new Date(now.toDateString()).toISOString())
          .limit(1)

        if (existingReminder && existingReminder.length > 0) {
          continue
        }

        if (invoice.clients?.email) {
          try {
            const emailRes = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: invoice.clients.email,
                  template: "reminder",
                  data: {
                    client_name: invoice.clients.business_name,
                    invoice_number: invoice.invoice_number,
                    total: invoice.total,
                    overdue_days: overdueDays,
                  },
                }),
              }
            )
            const emailResult = await emailRes.json()

            logs.push({
              action: "invoice_reminder",
              details: `Sent reminder for ${invoice.invoice_number} to ${invoice.clients.email} (${overdueDays} days overdue). Result: ${emailResult.success ? "success" : "failed"}`,
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
      .select("id, contact_name, business_name, email, next_follow_up_at")
      .in("status", ["contacted", "interested", "proposal_sent", "negotiation"])
      .lte("next_follow_up_at", now.toISOString())
      .not("email", "is", null)

    if (followUpLeads && followUpLeads.length > 0) {
      for (const lead of followUpLeads) {
        // Check if we already sent a follow-up today
        const { data: existingFollowUp } = await supabase
          .from("email_sends")
          .select("id")
          .eq("template", "follow_up")
          .eq("to", lead.email)
          .gte("created_at", new Date(now.toDateString()).toISOString())
          .limit(1)

        if (existingFollowUp && existingFollowUp.length > 0) {
          continue
        }

        try {
          const emailRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: lead.email,
                template: "follow_up",
                data: {
                  lead_name: lead.contact_name || lead.business_name,
                  lead_business: lead.business_name,
                },
              }),
            }
          )
          const emailResult = await emailRes.json()

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
            details: `Sent follow-up to ${lead.business_name} (${lead.email}). Result: ${emailResult.success ? "success" : "failed"}`,
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
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/reports`,
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

    // 4. Log all automation actions
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
