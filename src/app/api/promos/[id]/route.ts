import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"

export async function DELETE(request: Request) {
  const { supabase, error } = await requireTeamRole()
  if (error) return error

  const id = new URL(request.url).pathname.split("/").pop()
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from("promo_recipients")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}