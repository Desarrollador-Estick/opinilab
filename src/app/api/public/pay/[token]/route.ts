import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Crea un PaymentIntent para pagar una factura desde el enlace público.
// Con setup_future_usage="off_session" la tarjeta se guarda en el cliente de
// Stripe, permitiendo los cobros automáticos del día 1 en adelante.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const supabase = isServiceRoleConfigured()
      ? await createServerAdminClient()
      : await (await import("@/lib/supabase/server")).createClient()

    // Validar factura por token
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*, client:clients(id, business_name, email, stripe_customer_id)")
      .eq("payment_token", token)
      .maybeSingle()

    if (error) {
      console.error("public/pay error:", error)
      return NextResponse.json({ success: false, error: "Error al procesar el pago" }, { status: 500 })
    }

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Enlace de pago no válido" }, { status: 404 })
    }

    if (invoice.status === "paid" || invoice.status === "cancelled") {
      return NextResponse.json({ success: false, error: "Esta factura ya está pagada o cancelada" }, { status: 400 })
    }

    const client = Array.isArray(invoice.client) ? invoice.client[0] : invoice.client
    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 })
    }

    // Crear/recuperar el Stripe Customer asociado al cliente
    let stripeCustomerId = client.stripe_customer_id
    if (!stripeCustomerId) {
      const customerData: Stripe.CustomerCreateParams = { name: client.business_name }
      if (client.email) customerData.email = client.email
      const customer = await stripe.customers.create(customerData)
      stripeCustomerId = customer.id
      await supabase
        .from("clients")
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq("id", client.id)
    }

    // PaymentIntent por el total de la factura
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(invoice.total) * 100),
      currency: "eur",
      customer: stripeCustomerId,
      setup_future_usage: "off_session",
      metadata: {
        client_id: client.id,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        type: "invoice_link",
      },
      automatic_payment_methods: { enabled: true },
    })

    // Guardar PI en la factura
    await supabase
      .from("invoices")
      .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
      .eq("id", invoice.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      invoiceNumber: invoice.invoice_number,
      total: invoice.total,
      businessName: client.business_name,
    })
  } catch (e) {
    console.error("public/pay error:", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Error al procesar el pago" }, { status: 500 })
  }
}
