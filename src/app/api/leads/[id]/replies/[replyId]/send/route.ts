import { NextResponse } from "next/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { requireTeamRole } from "@/lib/team-auth"
import { sendEmail } from "@/lib/email/send"

// Envía manualmente la respuesta que el agente de ventas IA preparó para una
// réplica de un lead (gate de aprobación: el 'sí' y los borradores se envían
// SOLO cuando el humano lo decide desde /dashboard/leads/[id]).

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const { error: authError } = await requireTeamRole()
  if (authError) return authError

  const { id: leadId, replyId } = await params

  const supabase = await createServerAdminClient()
  const { data: reply } = await supabase
    .from("email_replies")
    .select("email_from, ai_reply, subject, reply_type, reply_status, lead_id")
    .eq("id", replyId)
    .maybeSingle()

  if (!reply?.ai_reply) {
    return NextResponse.json({ error: "Respuesta no encontrada o sin borrador" }, { status: 404 })
  }

  if (reply.lead_id && reply.lead_id !== leadId) {
    return NextResponse.json({ error: "La respuesta no pertenece a este lead" }, { status: 400 })
  }

  const emailResult = await sendEmail({
    to: reply.email_from,
    template: "salesAgent",
    subject: `Re: ${reply.subject || "tu consulta sobre OpiniLab"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f5f7;"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;color:#374151;line-height:1.7;white-space:pre-wrap;">${reply.ai_reply
      .replace(/</g, "&lt;")
      .replace(/\n/g, "<br/>")}</div></div>`,
    leadId,
    data: { replyId, replyType: reply.reply_type, sentBy: "human" },
  })

  if (!emailResult.ok) {
    return NextResponse.json(
      { error: "No se pudo enviar el email. Revisa Resend." },
      { status: 502 }
    )
  }

  await supabase
    .from("email_replies")
    .update({ reply_status: "sent_manual", handled_at: new Date().toISOString() })
    .eq("id", replyId)

  return NextResponse.json({ ok: true })
}