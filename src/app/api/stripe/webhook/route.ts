import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email/send"
import { paymentThanksEmail } from "@/lib/email/templates"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
  const { client_id, invoice_id } = paymentIntent.metadata || {}
  if (!client_id || !invoice_id) return

  // Un webhook no tiene sesión de usuario: usamos el cliente admin (service role)
  // para poder escribir en facturas/pagos/clientes, omitiendo RLS.
  const supabase = isServiceRoleConfigured()
    ? await createServerAdminClient()
    : await createClient()

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
  let clientPaymentMethodId: string | null = null
  if (typeof paymentIntent.payment_method === "string") {
    clientPaymentMethodId = paymentIntent.payment_method
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
  const { data: invoice } = await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: now })
    .eq("id", invoice_id)
    .in("status", ["draft", "sent"])
    .select()
    .single()

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
