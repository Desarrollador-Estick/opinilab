import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Automated review request - sends SMS/Email to customer
export async function POST(request: Request) {
  try {
    const { client_id, customer_name, customer_phone, customer_email } = await request.json()

    const supabase = await createClient()

    // Create review request
    const { data, error } = await supabase
      .from("review_requests")
      .insert({
        client_id,
        customer_name,
        customer_phone,
        customer_email,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Integrate with SMS/Email provider
    // For now, just log the request
    console.log(`Review request created for ${customer_name}: ${customer_email || customer_phone}`)

    // Update status to sent
    await supabase
      .from("review_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", data.id)

    return NextResponse.json({
      success: true,
      message: "Solicitud de reseña enviada",
      request: data,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al enviar solicitud" }, { status: 500 })
  }
}

// Get all review requests
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("review_requests")
      .select("*, clients(business_name)")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, requests: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al obtener solicitudes" }, { status: 500 })
  }
}
