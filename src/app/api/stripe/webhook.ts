import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
}) as Stripe

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  // Manejamos el evento de checkout session completado
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Obtenemos el customer ID y email de la sesión
    const customerId = session.customer as string
    const clientEmail = session.customer_email as string

    if (!customerId || !clientEmail) {
      return NextResponse.json(
        { error: "Sesión de Stripe sin customer o email" },
        { status: 400 }
      )
    }

    // Usamos el service role client para crear el cliente sin restricciones RLS
    const supabase = await createClient()

    // 1) Revisar si ya existe un cliente en OpiniLab con este email
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id, email")
      .eq("email", clientEmail)
      .maybeSingle()

    if (existingClient) {
      // Ya existe el cliente, solo aseguramos que tenga perfil
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, role, client_id")
        .eq("client_id", existingClient.id)
        .maybeSingle()

      if (!existingProfile || existingProfile.role !== "client") {
        // Crear perfil de cliente
        const { error: profileErr } = await supabase
          .from("profiles")
          .insert({
            id: existingClient.id,
            email: clientEmail,
            role: "client",
            client_id: existingClient.id,
            must_change_password: true,
          })

        if (profileErr) {
          console.error("Error creando perfil de cliente:", profileErr.message)
          return NextResponse.json(
            { error: "Error interno al crear perfil de cliente" },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        message: "Cliente existente actualizado",
        clientId: existingClient.id,
      })
    }

    // 2) Crear nuevo cliente en OpiniLab
    // Generar una contraseña temporal aleatoria
    const tmpPassword = Math.random()
      .toString(36)
      .substring(2, 12) + "!Temp2024"

    // Crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: clientEmail,
      password: tmpPassword,
      email_confirm: true,
      user_metadata: { full_name: clientEmail.split("@")[0] || "Cliente OpiniLab" },
    })

    if (authError) {
      console.error("Error creando usuario auth:", authError.message)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authUser?.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Usuario de auth no creado" }, { status: 500 })
    }

    // Crear la fila de client
    const { error: clientErr } = await supabase.from("clients").insert({
      id: userId,
      email: clientEmail,
      business_name: clientEmail.split("@")[0] || "Cliente OpiniLab",
      contact_name: clientEmail.split("@")[0] || "Cliente OpiniLab",
      status: "active",
    })

    if (clientErr) {
      // Si falla el client, borramos el usuario auth creado
      await supabase.auth.admin.deleteUser(userId)
      console.error("Error creando client:", clientErr.message)
      return NextResponse.json({ error: clientErr.message }, { status: 500 })
    }

    // 3) Crear el perfil vinculado
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      email: clientEmail,
      full_name: clientEmail.split("@")[0] || "Cliente OpiniLab",
      role: "client",
      client_id: userId,
      must_change_password: true,
    })

    if (profileErr) {
      // Intento de limpieza: borrar user y client
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from("clients").delete().eq("id", userId)
      console.error("Error creando perfil:", profileErr.message)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Cliente creado automáticamente desde Stripe",
      clientId: userId,
      temporaryPassword: tmpPassword,
    })
  }

  // Otros eventos que no gestionamos activamente
  console.log(`Evento recibido: ${event.type}`)
  return NextResponse.json({ received: true })
}