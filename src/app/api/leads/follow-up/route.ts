import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Automated lead scoring and follow-up
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get leads that need follow-up
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .not("status", "in", '("won", "lost")')
      .lte("next_follow_up_at", new Date().toISOString())
      .order("score", { ascending: false })
      .limit(10)

    if (error) throw error

    const followUps = leads?.map((lead) => ({
      lead_id: lead.id,
      business_name: lead.business_name,
      contact_name: lead.contact_name,
      email: lead.email,
      score: lead.score,
      days_since_contact: lead.last_contact_at
        ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })) || []

    return NextResponse.json({
      success: true,
      follow_ups: followUps,
      count: followUps.length,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al obtener seguimientos" }, { status: 500 })
  }
}

// Update lead status and schedule next follow-up
export async function PUT(request: Request) {
  try {
    const { lead_id, status, notes, next_follow_up_days } = await request.json()

    const supabase = await createClient()

    const updateData: any = {
      status,
      notes,
      last_contact_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (next_follow_up_days) {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + next_follow_up_days)
      updateData.next_follow_up_at = nextDate.toISOString()
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, lead: data })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al actualizar lead" }, { status: 500 })
  }
}
