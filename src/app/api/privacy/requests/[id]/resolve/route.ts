import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { wipePersonData } from "@/lib/privacy/wipe"

// Resuelve una solicitud de derechos. Para 'supresion', 'oposicion' y
// 'baja_marketing' ejecuta el borrado real de los datos asociados al email
// (réplicas, envíos, leads anonimizados + baja en la lista de suprimidos).

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireTeamRole()
  if (authError) return authError

  const { id } = await params
  const supabase = await createServerAdminClient()

  const { data: requestRow } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!requestRow) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  }

  const wipeTypes = ["supresion", "oposicion", "baja_marketing"]
  const wipe = wipeTypes.includes(requestRow.request_type)
    ? await wipePersonData(supabase, requestRow.email)
    : null

  const handledAt = new Date().toISOString()
  await supabase
    .from("privacy_requests")
    .update({ status: "resuelto", handled_at: handledAt })
    .eq("id", id)

  return NextResponse.json({ ok: true, wipe })
}