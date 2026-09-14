import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const LAUNCH_PLAN_NAME = "Plan Lanzamiento 49€/mes"
const LAUNCH_PRICE_EUR = 49

async function getAdminClient() {
  if (isServiceRoleConfigured()) {
    return await createServerAdminClient()
  }
  return (await import("@/lib/supabase/server")).createClient()
}

// Datos de la oferta pública de un lead (token = id del lead).
// No expone datos sensibles: solo nombre del negocio y la oferta.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await getAdminClient()

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, business_name, contact_name, email, status, converted_client_id")
      .eq("id", token)
      .maybeSingle()

    if (error || !lead) {
      return NextResponse.json(
        { success: false, error: "Enlace no válido" },
        { status: 404 }
      )
    }

    if (lead.status === "won") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        businessName: lead.business_name,
      })
    }

    if (!lead.email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Este negocio aún no tiene un email vinculado. Escríbenos a info@opinilab.com y lo resolvemos.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      businessName: lead.business_name,
      contactName: lead.contact_name || "",
      email: lead.email,
      offer: {
        name: LAUNCH_PLAN_NAME,
        price: LAUNCH_PRICE_EUR,
        currency: "eur",
        description:
          "Gestión y respuesta automática de tus reseñas de Google + visibilidad online.",
      },
      stripeLive: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true,
    })
  } catch (e) {
    console.error("lead-pay GET error:", e)
    return NextResponse.json(
      { success: false, error: "Error al cargar la oferta" },
      { status: 500 }
    )
  }
}

// Crea el PaymentIntent del Plan de Lanzamiento para un lead concreto.
// metadata.lead_id llega al webhook para poder generar el cliente al pagar.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await getAdminClient()

    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, business_name, email, status, converted_client_id")
      .eq("id", token)
      .maybeSingle()

    if (error || !lead) {
      return NextResponse.json(
        { success: false, error: "Enlace de pago no válido" },
        { status: 404 }
      )
    }
    if (lead.status === "won") {
      return NextResponse.json(
        { success: false, error: "Este negocio ya se ha dado de alta" },
        { status: 400 }
      )
    }
    if (!lead.email) {
      return NextResponse.json(
        { success: false, error: "Este lead no tiene un email vinculado" },
        { status: 400 }
      )
    }

    // Evitar duplicados: si el email ya es cliente, no crear otro.
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, email")
      .eq("email", lead.email)
      .maybeSingle()
    if (existingClient) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Este email ya tiene una cuenta activa. Escríbenos a info@opinilab.com y lo revisamos.",
        },
        { status: 400 }
      )
    }

    // Cliente de Stripe reutilizable (para el cobro automático del mes 2 en adelante)
    const { data: customers } = await stripe.customers.list({
      email: lead.email,
      limit: 1,
    })
    let customer = customers[0] ?? null
    if (!customer) {
      customer = await stripe.customers.create({
        name: lead.business_name,
        email: lead.email,
      })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: LAUNCH_PRICE_EUR * 100,
      currency: "eur",
      customer: customer.id,
      setup_future_usage: "off_session",
      metadata: {
        lead_id: lead.id,
        type: "lead_offer",
      },
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      businessName: lead.business_name,
      offer: { name: LAUNCH_PLAN_NAME, price: LAUNCH_PRICE_EUR, currency: "eur" },
      stripeLive: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true,
    })
  } catch (e) {
    console.error("lead-pay POST error:", e)
    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error ? e.message : "Error al iniciar el pago. Inténtalo de nuevo.",
      },
      { status: 500 }
    )
  }
}