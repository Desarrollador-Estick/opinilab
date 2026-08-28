import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { client_id, title, content, value, start_date, end_date } = await request.json()

    const supabase = await createClient()

    // Get next contract number
    const { count } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })

    const year = new Date().getFullYear()
    const sequence = (count || 0) + 1
    const contract_number = `CON-${year}-${String(sequence).padStart(4, "0")}`

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        client_id,
        contract_number,
        title,
        content,
        value,
        start_date,
        end_date,
        status: "draft",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, contract: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al crear contrato" }, { status: 500 })
  }
}
