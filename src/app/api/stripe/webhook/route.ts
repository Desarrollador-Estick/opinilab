import { NextResponse } from "next/server"
import Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { paymentThanksEmail } from "@/lib/email/templates"
import { generateTemporaryPassword } from "@/lib/nif-password"
import { generateInvoiceNumber } from "@/lib/utils"
import { sendClientCredentialsEmail } from "@/lib/email/client-credentials"
import { runClientOnboarding } from "@/lib/onboarding"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const LAUNCH_PLAN_NAME = "Plan Lanzamiento 49€/mes"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await handlePaymentSuccess(paymentIntent)
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await handlePaymentFailed(paymentIntent)
  } else if (event.type === "payment_intent.canceled") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    await handlePaymentCanceled(paymentIntent)
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { client_id, invoice_id, lead_id, type } = paymentIntent.metadata || {}

  // Un webhook no tiene sesión de usuario: usamos el cliente admin (service role)
  // para poder escribir en facturas/pagos/clientes, omitiendo RLS.
  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

  // Alta automática: el pago del enlace público por lead genera el cliente.
  if (type === "lead_offer" && lead_id) {
    await handleLeadOfferPayment(supabase as SupabaseClient<Database>, paymentIntent)
    return
  }

  if (!client_id || !invoice_id) return

  const now = new Date().toISOString()

  // Marcar factura como pagada
  const { data: invoice } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: now,
      stripe_payment_method: paymentIntent.payment_method_types?.[0] || "card",
      updated_at: now,
    })
    .eq("id", invoice_id)
    .select()
    .single()

  if (invoice) {
    // Registrar el pago
    await supabase.from("payments").insert({
      invoice_id: invoice.id,
      amount: Number(invoice.total),
      payment_method: "card",
      payment_date: now,
      reference: paymentIntent.id,
      notes: `Pago recibido vía Stripe (${paymentIntent.id})`,
    })
  }

  // Activar al cliente
  await supabase
    .from("clients")
    .update({ status: "active", updated_at: now })
    .eq("id", client_id)

  // Guardar el método de pago para cobros recurrentes del día 1.
  // Con setup_future_usage="off_session" Stripe indica los métodos reutilizables
  // en paymentIntent.payment_method (es un ID de PaymentMethod cuando se confirmó).
  if (typeof paymentIntent.payment_method === "string") {
    await supabase
      .from("clients")
      .update({
        stripe_default_payment_method_id: paymentIntent.payment_method,
        updated_at: now,
      })
      .eq("id", client_id)
  }

  // Email de agradecimiento cuando el pago viene del enlace público de factura
  if (paymentIntent.metadata?.type === "invoice_link") {
    const { data: clientData } = await supabase
      .from("clients")
      .select("email, contact_name, business_name")
      .eq("id", client_id)
      .maybeSingle()

    const client = Array.isArray(clientData) ? clientData[0] : clientData

    if (client?.email && invoice) {
      await sendEmail({
        to: client.email,
        template: "paymentThanks",
        subject: `✅ Pago recibido - Factura ${invoice.invoice_number}`,
        html: paymentThanksEmail(
          client.business_name || "tu negocio",
          client.contact_name || "cliente",
          invoice.invoice_number,
          Number(invoice.total)
        ).html,
        clientId: client_id,
        data: {
          businessName: client.business_name,
          contactName: client.contact_name,
          invoiceNumber: invoice.invoice_number,
          total: Number(invoice.total),
        },
      })
    }
  }
}

// El pago falló: la factura NO se paga, el cliente NO se activa.
// Según la regla de negocio, si no paga no se trabaja → se queda pendiente.
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { client_id, invoice_id } = paymentIntent.metadata || {}
  if (!client_id || !invoice_id) return

  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

  const now = new Date().toISOString()

  // Solo actualizamos si la factura aún no se ha pagado (evita sobrescribir un pago real)
  await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: now })
    .eq("id", invoice_id)
    .in("status", ["draft", "sent"])

  console.warn(
    `Pago fallido para factura ${invoice_id} (${paymentIntent.id}). El cliente ${client_id} no se activa.`
  )
}

// El intent fue cancelado: devolvemos la factura a borrador/sin pagar.
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const { client_id, invoice_id } = paymentIntent.metadata || {}
  if (!client_id || !invoice_id) return

  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

  const now = new Date().toISOString()

  await supabase
    .from("invoices")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", invoice_id)
    .in("status", ["draft", "sent"])
}

// Alta automática de cliente desde el pago del enlace público por lead
// (metadata.type === "lead_offer"). La primera cuota del Plan de Lanzamiento
// genera el cliente (cuenta de portal + perfil), asigna el servicio, crea la
// factura pagada, lanza el onboarding y marca el lead como ganado.
async function handleLeadOfferPayment(
  supabase: SupabaseClient<Database>,
  paymentIntent: Stripe.PaymentIntent
) {
  const leadId = paymentIntent.metadata?.lead_id
  if (!leadId) return

  const now = new Date().toISOString()

  // 1) Lead + idempotencia (un retry de Stripe no puede duplicar el alta)
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, business_name, contact_name, email, phone, website, city, industry, source, notes, status, converted_client_id"
    )
    .eq("id", leadId)
    .maybeSingle()
  if (!lead) {
    console.warn(`[lead-pay] Lead ${leadId} no encontrado al procesar el pago.`)
    return
  }
  if (lead.status === "won" && lead.converted_client_id) {
    console.log(`[lead-pay] Pago duplicado, lead ${leadId} ya convertido.`)
    return
  }
  if (!lead.email) {
    console.warn(`[lead-pay] Lead ${leadId} sin email: no se puede crear el cliente.`)
    return
  }

  // 2) Evitar duplicar cliente por email
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id, email")
    .eq("email", lead.email)
    .maybeSingle()

  let clientId = existingClient?.id ?? null
  let temporaryPassword: string | null = null

  // 3) Crear cliente + cuenta de portal (solo si no existía con ese email)
  if (!clientId) {
    temporaryPassword = generateTemporaryPassword()
    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email: lead.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: lead.contact_name || lead.business_name },
    })
    if (authError || !created?.user) {
      console.warn(
        `[lead-pay] No se pudo crear el usuario auth de ${lead.email}:`,
        authError?.message
      )
      return
    }
    clientId = created.user.id

    const { error: clientErr } = await supabase.from("clients").insert({
      id: clientId,
      business_name: lead.business_name,
      contact_name: lead.contact_name || "",
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      city: lead.city,
      industry: lead.industry,
      lead_source: lead.source,
      notes: lead.notes,
      status: "active",
      stripe_customer_id:
        typeof paymentIntent.customer === "string" ? paymentIntent.customer : null,
      stripe_default_payment_method_id:
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : null,
    })
    if (clientErr) {
      await supabase.auth.admin.deleteUser(clientId).catch(() => {})
      console.warn(`[lead-pay] No se pudo crear el cliente ${lead.business_name}:`, clientErr.message)
      return
    }

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: clientId,
      email: lead.email,
      full_name: lead.contact_name || lead.business_name,
      role: "client",
      client_id: clientId,
      must_change_password: true,
    })
    if (profileErr) {
      await supabase.auth.admin.deleteUser(clientId).catch(() => {})
      try { await supabase.from("clients").delete().eq("id", clientId) } catch {}
      console.warn(`[lead-pay] No se pudo crear el perfil de ${lead.email}:`, profileErr.message)
      return
    }
  } else {
    // Cliente existente: guardamos el método de pago para el cobro del mes 2
    const patch: Record<string, unknown> = {}
    if (typeof paymentIntent.customer === "string") {
      patch.stripe_customer_id = paymentIntent.customer
    }
    if (typeof paymentIntent.payment_method === "string") {
      patch.stripe_default_payment_method_id = paymentIntent.payment_method
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("clients").update({ ...patch, updated_at: now }).eq("id", clientId)
    }
  }

  if (!clientId) return

  // 4) Servicio Plan de Lanzamiento (asignación idempotente)
  const { data: service } = await supabase
    .from("services")
    .select("id, name, base_price, billing_cycle, waive_setup")
    .eq("name", LAUNCH_PLAN_NAME)
    .maybeSingle()
  if (!service) {
    console.warn(`[lead-pay] No se encontró el servicio ${LAUNCH_PLAN_NAME}.`)
    return
  }

  const { data: existingCs } = await supabase
    .from("client_services")
    .select("id")
    .eq("client_id", clientId)
    .eq("service_id", service.id)
    .maybeSingle()
  if (!existingCs) {
    await supabase.from("client_services").insert({
      client_id: clientId,
      service_id: service.id,
      status: "active",
      start_date: now,
      managed_by: "ai",
    })
  }

  // 5) Factura pagada (idempotente por PaymentIntent)
  const { data: priorInvoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, total")
    .eq("client_id", clientId)
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle()
  let invoice: { id?: string; invoice_number: string; total: number } | null = priorInvoice ?? null
  if (!invoice) {
    invoice = await createPaidLaunchInvoice(supabase, clientId, service, paymentIntent, now)
  }

  // 6) Credenciales del portal (solo cliente recién creado)
  if (temporaryPassword) {
    try {
      await sendClientCredentialsEmail({
        email: lead.email,
        temporaryPassword,
        fullName: lead.contact_name || lead.business_name,
        clientId,
      })
    } catch (e) {
      console.warn("[lead-pay] No se pudo enviar las credenciales:", e)
    }
  }

  // 7) Onboarding: carpeta Drive, contrato de alta y email de bienvenida.
  try {
    await runClientOnboarding({ clientId })
  } catch (e) {
    console.warn("[lead-pay] Onboarding con errores:", e)
  }

  // 8) Marcar el lead como ganado
  await supabase
    .from("leads")
    .update({ status: "won", converted_client_id: clientId, updated_at: now })
    .eq("id", leadId)

  // 9) Email de confirmación de pago
  try {
    const { data: client } = await supabase
      .from("clients")
      .select("email, contact_name, business_name")
      .eq("id", clientId)
      .maybeSingle()
    if (client?.email) {
      await sendEmail({
        to: client.email,
        template: "paymentThanks",
        subject: `✅ Pago recibido - ${LAUNCH_PLAN_NAME}`,
        html: paymentThanksEmail(
          client.business_name || "tu negocio",
          client.contact_name || "cliente",
          invoice?.invoice_number || "",
          Number(invoice?.total ?? service.base_price)
        ).html,
        clientId,
        data: {
          businessName: client.business_name,
          contactName: client.contact_name,
          invoiceNumber: invoice?.invoice_number || "",
          total: Number(invoice?.total ?? service.base_price),
        },
      })
    }
  } catch (e) {
    console.warn("[lead-pay] No se pudo enviar el email de agradecimiento:", e)
  }

  console.log(
    `[lead-pay] Cliente creado automáticamente desde el pago del lead ${leadId}: ${lead.business_name} (${clientId})`
  )
}

// Crea la factura PAGADA del Plan de Lanzamiento (precio total 49€ IVA incl.,
// subtotal sin IVA + 21%). Devuelve la factura para poder usarla después.
async function createPaidLaunchInvoice(
  supabase: SupabaseClient<Database>,
  clientId: string,
  service: {
    id: string
    name: string
    base_price: number | null
    billing_cycle: string | null
  },
  paymentIntent: Stripe.PaymentIntent,
  now: string
) {
  const total = Math.round((Number(service.base_price) || 49) * 100) / 100
  const tax_rate = 21
  const subtotal = Math.round((total / (1 + tax_rate / 100)) * 100) / 100
  const tax_amount = Math.round((total - subtotal) * 100) / 100

  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true })
  const year = new Date().getFullYear()
  const invoiceNumber = generateInvoiceNumber(year, (count || 0) + 1)
  const paymentToken = randomUUID().replace(/-/g, "")
  const period = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      status: "paid",
      paid_at: now,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      issue_date: now.split("T")[0],
      due_date: now.split("T")[0],
      notes: `Contratación online - ${service.name}`,
      payment_token: paymentToken,
      stripe_payment_intent_id: paymentIntent.id,
    })
    .select()
    .single()

  if (error || !invoice) {
    console.warn(`[lead-pay] No se pudo crear la factura pagada:`, error?.message || "sin datos")
    return null
  }

  await supabase.from("invoice_items").insert({
    invoice_id: invoice.id,
    description: `Servicios del mes ${period} - ${service.name}`,
    quantity: 1,
    unit_price: total,
    total,
  })

  await supabase.from("payments").insert({
    invoice_id: invoice.id,
    amount: total,
    payment_method: "card",
    payment_date: now,
    reference: paymentIntent.id,
    notes: `Pago recibido vía Stripe (${paymentIntent.id}) - Alta automática`,
  })

  return invoice as { invoice_number: string; total: number }
}
