import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  try {
    const { client_id, service_id, setup_fee } = await request.json()

    if (!client_id || !service_id) {
      return NextResponse.json(
        { success: false, error: "client_id y service_id son obligatorios" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Cargar cliente y servicio
    const [clientRes, serviceRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", client_id).single(),
      supabase.from("services").select("*").eq("id", service_id).single(),
    ])

    if (clientRes.error || !clientRes.data)
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 })
    if (serviceRes.error || !serviceRes.data)
      return NextResponse.json({ success: false, error: "Servicio no encontrado" }, { status: 404 })

    const client = clientRes.data
    const service = serviceRes.data

    // Crear o recuperar el cliente de Stripe
    let stripeCustomerId = client.stripe_customer_id
    if (!stripeCustomerId) {
      const customerData: Stripe.CustomerCreateParams = {
        name: client.business_name,
        metadata: { client_id: client.id },
      }
      // Stripe rechaza emails mal formados (p.ej. "info@juana"). Solo lo pasamos si es válido.
      if (client.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
        customerData.email = client.email
      }
      if (client.phone) customerData.phone = client.phone

      const customer = await stripe.customers.create(customerData)
      stripeCustomerId = customer.id
      await supabase
        .from("clients")
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq("id", client.id)
    }

    // Precio del mes (custom o base del servicio)
    const clientServiceRes = await supabase
      .from("client_services")
      .select("custom_price")
      .eq("client_id", client.id)
      .eq("service_id", service.id)
      .maybeSingle()

    const monthlyPrice = clientServiceRes.data?.custom_price ?? Number(service.base_price)

    // Setup fee (por defecto: un mes extra como coste de alta configurable)
    const setupFeeAmount = Number(setup_fee ?? monthlyPrice)

    // Crear factura (setup + mes corriente) pagadera por adelantado
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${year}-${month}-01`)

    const sequence = (count ?? 0) + 1
    const invoiceNumber = `FAC-${year}-${month}-${String(sequence).padStart(3, "0")}`

    const taxRate = 21
    const subtotal = monthlyPrice + setupFeeAmount
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100

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
        issue_date: now.toISOString().split("T")[0],
        due_date: now.toISOString().split("T")[0],
        notes: `Alta de servicio: ${service.name}`,
      })
      .select()
      .single()

    if (invoiceError || !invoice)
      return NextResponse.json({ success: false, error: "Error al crear la factura" }, { status: 500 })

    await supabase.from("invoice_items").insert([
      {
        invoice_id: invoice.id,
        description: `Alta de servicio: ${service.name}`,
        quantity: 1,
        unit_price: setupFeeAmount,
        total: setupFeeAmount,
      },
      {
        invoice_id: invoice.id,
        description: `Servicio ${service.name} - mes corriente`,
        quantity: 1,
        unit_price: monthlyPrice,
        total: monthlyPrice,
      },
    ])

    // Crear PaymentIntent (en céntimos)
    // setup_future_usage: "off_session" → Stripe guarda el método de pago en el
    // cliente para poder cobrar automáticamente los meses siguientes (día 1).
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "eur",
      customer: stripeCustomerId,
      setup_future_usage: "off_session",
      metadata: {
        client_id: client.id,
        invoice_id: invoice.id,
        invoice_number: invoiceNumber,
      },
      automatic_payment_methods: { enabled: true },
    })

    // Guardar el PI en la factura
    await supabase
      .from("invoices")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      setup_fee: setupFeeAmount,
      monthly_price: monthlyPrice,
      subtotal,
      tax_amount: taxAmount,
      total,
      stripeLive: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true,
    })
  } catch (error) {
    console.error("Stripe create payment intent error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al crear el pago" },
      { status: 500 }
    )
  }
}
