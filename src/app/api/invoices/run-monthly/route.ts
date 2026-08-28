import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { invoiceWithLinkEmail, paymentReminder } from "@/lib/email/templates"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const GRACE_DAYS = 5

interface JobResult {
  client_id: string
  business_name: string
  invoice_number: string | null
  outcome: "created_paid" | "created_unpaid" | "no_payment_method" | "no_services" | "already_invoiced" | "skipped"
  detail?: string
}

/**
 * Facturación mensual automática (día 1 de cada mes).
 *
 * - POST para el botón del dashboard (requiere sesión de admin).
 * - También se puede invocar desde un cron externo enviando el header
 *   `x-cron-secret` (igual al valor de la variable CRON_SECRET) en producción.
 *
 * Para cada cliente activo con servicios mensuales activos y sin factura del
 * mes corriente:
 *   1. Crea la factura del mes con sus líneas.
 *   2. Cobra automáticamente con la tarjeta guardada (off_session).
 *   3. Si el cobro falla → factura overdue + cliente paused + email de
 *      recordatorio.
 */
async function runMonthly(request: Request) {
  const authHeader = request.headers.get("x-cron-secret")

  // Cliente de BD para la operación. Con RLS restringido a `authenticated`,
  // el cobro automático (cron/día 1) NO tiene sesión de usuario → usamos la
  // service role (omite RLS) siempre que esté configurada. El `CRON_SECRET`
  // añade una capa de autorización para invocarlo desde un cron externo.
  let supabase: any
  if (isServiceRoleConfigured()) {
    supabase = await createServerAdminClient()
  } else if (authHeader && process.env.CRON_SECRET && authHeader === process.env.CRON_SECRET) {
    supabase = await (await import("@/lib/supabase/server")).createClient()
  } else {
    supabase = await createClient()
  }

  // ---- Determinar mes objetivo ----
  const now = new Date()
  const year = Number(new URL(request.url).searchParams.get("year") ?? now.getFullYear())
  const month = Number(new URL(request.url).searchParams.get("month") ?? now.getMonth() + 1)
  const period = `${year}-${String(month).padStart(2, "0")}`

  // ---- Servicios activos por cliente ----
  const { data: clientServices } = await supabase
    .from("client_services")
    .select(`client_id, status, custom_price, services ( id, name, base_price, billing_cycle )`)
    .eq("status", "active")

  if (!clientServices || clientServices.length === 0) {
    return NextResponse.json({ success: true, period, results: [], message: "No hay servicios activos" })
  }

  const byClient = new Map<string, { service: any; price: number }[]>()
  for (const cs of clientServices as any[]) {
    const svc = Array.isArray(cs.services) ? cs.services[0] : cs.services
    if (!svc || svc.billing_cycle !== "monthly") continue
    const price = cs.custom_price != null ? Number(cs.custom_price) : Number(svc.base_price)
    const list = byClient.get(cs.client_id) || []
    list.push({ service: svc, price })
    byClient.set(cs.client_id, list)
  }

  if (byClient.size === 0) {
    return NextResponse.json({ success: true, period, results: [], message: "No hay servicios mensuales activos" })
  }

  const clientIds = Array.from(byClient.keys())

  const { data: clients } = await supabase
    .from("clients")
    .select("id, business_name, contact_name, email, status, stripe_customer_id, stripe_default_payment_method_id")
    .in("id", clientIds)
    .eq("status", "active")

  if (!clients || clients.length === 0) {
    return NextResponse.json({ success: true, period, results: [], message: "No hay clientes activos" })
  }

  // Facturas ya existentes del periodo (para no duplicar facturación)
  const { data: monthInvoices } = await supabase
    .from("invoices")
    .select("id, client_id, status")
    .gte("created_at", `${period}-01`)
    .lt("created_at", `${period}-31T23:59:59`)

  const invoicedClientIds = new Set<string>((monthInvoices ?? []).map((i: any) => i.client_id))

  // Número de factura secuencial por periodo
  const { count: periodInvoiceCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${period}-01`)
    .lt("created_at", `${period}-31T23:59:59`)

  let sequence = periodInvoiceCount ?? 0
  const results: JobResult[] = []

  for (const rawClient of clients as any[]) {
    const client = rawClient
    const list = byClient.get(client.id)!

    if (invoicedClientIds.has(client.id)) {
      results.push({ client_id: client.id, business_name: client.business_name, invoice_number: null, outcome: "already_invoiced" })
      continue
    }

    sequence += 1
    const invoiceNumber = `FAC-${period.replace("-", "-")}-${String(sequence).padStart(3, "0")}`
    const paymentToken = randomUUID().replace(/-/g, "")

    const subtotal = list.reduce((acc, s) => acc + s.price, 0)
    const taxRate = 21
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

    const issueDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split("T")[0]

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: client.id,
        invoice_number: invoiceNumber,
        status: "draft",
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        issue_date: issueDate,
        notes: `Servicios del mes ${period}`,
        payment_token: paymentToken,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "skipped", detail: "error_creando_factura" })
      continue
    }

    await supabase.from("invoice_items").insert(
      list.map((s) => ({
        invoice_id: invoice.id,
        description: `Servicio ${s.service.name} - ${period}`,
        quantity: 1,
        unit_price: s.price,
        total: s.price,
      }))
    )

    // ---- Cobro automático off_session ----
    if (client.stripe_customer_id && client.stripe_default_payment_method_id) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: "eur",
          customer: client.stripe_customer_id,
          payment_method: client.stripe_default_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: {
            client_id: client.id,
            invoice_id: invoice.id,
            invoice_number: invoiceNumber,
            type: "monthly",
          },
        })

        await supabase
          .from("invoices")
          .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
          .eq("id", invoice.id)

        if (paymentIntent.status === "succeeded") {
          await supabase
            .from("invoices")
            .update({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_method: "card", updated_at: new Date().toISOString() })
            .eq("id", invoice.id)
          await supabase.from("payments").insert({
            invoice_id: invoice.id,
            amount: total,
            payment_method: "card",
            payment_date: new Date().toISOString().split("T")[0],
            reference: paymentIntent.id,
            notes: `Cobro automático mensual ${period} (${paymentIntent.id})`,
          })
          results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "created_paid" })
        } else {
          await markUnpaidAndPause(supabase, invoice, client, invoiceNumber, total, paymentIntent.status, period)
          results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "created_unpaid", detail: paymentIntent.status })
        }
      } catch (e: any) {
        console.error("Cargo automático fallido:", client.id, e?.message)
        await markUnpaidAndPause(supabase, invoice, client, invoiceNumber, total, e?.message, period)
        results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "created_unpaid", detail: e?.message })
      }
    } else if (!client.stripe_default_payment_method_id) {
      // Sin tarjeta guardada: facturamos, marcamos como enviada y enviamos el
      // email con el enlace seguro de pago para que el cliente pague online
      // (y así quede su tarjeta guardada para futuros cobros).
      await supabase
        .from("invoices")
        .update({ status: "sent", updated_at: new Date().toISOString() })
        .eq("id", invoice.id)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const payUrl = `${appUrl}/pagar/${paymentToken}`

      await sendEmail({
        to: client.email,
        template: "invoice",
        subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || "Agencia Marketing"}`,
        html: invoiceWithLinkEmail(invoiceNumber, total, issueDate, client.contact_name || client.business_name, payUrl).html,
        clientId: client.id,
        data: { invoiceNumber, total, dueDate: issueDate, clientName: client.business_name, payUrl },
      })

      results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "no_payment_method", detail: "email_con_enlace_enviado" })
    } else {
      results.push({ client_id: client.id, business_name: client.business_name, invoice_number: invoiceNumber, outcome: "skipped", detail: "sin_stripe_customer" })
    }
  }

  return NextResponse.json({ success: true, period, results })
}

async function markUnpaidAndPause(supabase: any, invoice: any, client: any, invoiceNumber: string, total: number, detail: string, period: string) {
  await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .eq("id", invoice.id)
  await supabase
    .from("clients")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", client.id)

  await sendEmail({
    to: client.email,
    template: "paymentReminder",
    subject: `Recordatorio: Factura ${invoiceNumber} pendiente`,
    html: paymentReminder(invoiceNumber, total, GRACE_DAYS, client.contact_name || client.business_name).html,
    clientId: client.id,
    data: { invoiceNumber, total, daysOverdue: GRACE_DAYS, clientName: client.business_name },
  })

  console.warn(`[run-monthly] Factura ${invoiceNumber} sin pagar (${period}). Cliente ${client.id} pausado. Detalle: ${detail}`)
}

export async function POST(request: Request) {
  try {
    return await runMonthly(request)
  } catch (error) {
    console.error("run-monthly error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}

// Permite invocarlo también por GET desde un cron simplificado (misma lógica).
export async function GET(request: Request) {
  try {
    return await runMonthly(request)
  } catch (error) {
    console.error("run-monthly error:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Error interno" }, { status: 500 })
  }
}
