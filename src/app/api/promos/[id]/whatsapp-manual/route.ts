import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"

// Mark a recipient's WhatsApp as sent manually (when admin uses wa.me link)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const { id } = await params

  const { error: updateError } = await supabase
    .from("promo_recipients")
    .update({
      whatsapp_status: "sent",
      whatsapp_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
