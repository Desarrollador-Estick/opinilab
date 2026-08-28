import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { business_name, contact_name, email, phone, website, city, industry, source } = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("leads")
      .insert({
        business_name,
        contact_name,
        email,
        phone,
        website,
        city,
        industry,
        source: source || "website",
        status: "new",
        score: 50,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al crear lead" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, leads: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al obtener leads" }, { status: 500 })
  }
}
