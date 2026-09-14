import { NextResponse } from "next/server"
import { requireTeamRole } from "@/lib/team-auth"
import { convertLeadToClientAction } from "@/app/dashboard/leads/actions"
import { addClientServiceAction } from "@/app/dashboard/clientes/actions"

export const maxDuration = 300

const LAUNCH_PLAN_NAME = "Plan Lanzamiento 49€/mes"
const MAX_BATCH = 25

export async function POST(request: Request) {
  const { supabase, error: authError } = await requireTeamRole()
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const leadIds = Array.isArray(body?.lead_ids)
    ? body.lead_ids.filter((id: unknown) => typeof id === "string").slice(0, MAX_BATCH)
    : []
  if (leadIds.length === 0) {
    return NextResponse.json({ error: "No hay leads seleccionados" }, { status: 400 })
  }

  const requestedServiceId =
    typeof body?.service_id === "string" && body.service_id !== ""
      ? body.service_id
      : null
  const serviceQuery = requestedServiceId
    ? supabase.from("services").select("id, name").eq("id", requestedServiceId).maybeSingle()
    : supabase.from("services").select("id, name").eq("name", LAUNCH_PLAN_NAME).maybeSingle()

  const { data: service } = await serviceQuery
  if (!service) {
    return NextResponse.json(
      { error: "No se encontró el servicio de lanzamiento. Revisa el catálogo de servicios." },
      { status: 400 }
    )
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, business_name, email, status, converted_client_id")
    .in("id", leadIds)
  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No se encontraron leads" }, { status: 400 })
  }

  const emails = leads.map((l) => l.email).filter((e): e is string => Boolean(e))
  const { data: existingClients } = emails.length
    ? await supabase.from("clients").select("id, email").in("email", emails)
    : { data: [] }
  const takenEmails = new Set((existingClients || []).map((c) => c.email))

  const converted: {
    leadId: string
    clientId: string
    accountCreated?: boolean
  }[] = []
  const failed: { leadId: string; reason: string }[] = []
  const skipped: { leadId: string; reason: string }[] = []

  for (const lead of leads) {
    if (lead.status === "won" || lead.converted_client_id) {
      skipped.push({ leadId: lead.id, reason: "ya convertido" })
      continue
    }
    if (!lead.email) {
      skipped.push({ leadId: lead.id, reason: "sin email para crear cuenta" })
      continue
    }
    if (takenEmails.has(lead.email)) {
      skipped.push({ leadId: lead.id, reason: "email ya existe como cliente" })
      continue
    }

    const result = await convertLeadToClientAction(lead.id)
    if (!result.ok || !result.clientId) {
      failed.push({ leadId: lead.id, reason: result.error || "error de conversión" })
      continue
    }

    const serviceResult = await addClientServiceAction(result.clientId, service.id, "ai")
    if (serviceResult.error) {
      failed.push({
        leadId: lead.id,
        reason: `cliente creado pero servicio no asignado: ${serviceResult.error}`,
      })
      continue
    }

    converted.push({
      leadId: lead.id,
      clientId: result.clientId,
      accountCreated: result.accountCreated,
    })
  }

  return NextResponse.json({
    success: true,
    service: service.name,
    converted,
    failed,
    skipped,
    converted_count: converted.length,
    failed_count: failed.length,
    skipped_count: skipped.length,
    batch_max: MAX_BATCH,
    total_leads: leads.length,
  })
}