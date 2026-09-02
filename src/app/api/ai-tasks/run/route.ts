import { NextResponse } from "next/server"
import { isServiceRoleConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { processTaskBatch } from "@/lib/ai/ai-tasks"

// Worker de la cola de tareas IA. Procesa las tareas de forma consecutiva
// (invocando Groq de una en una), hasta cumplir el lote o agotar el cupo.
// Si el cupo gratis se agota, las tareas restantes pasan a "waiting" y esperan
// a que el admin reactive el cupo para volver a procesarse en orden.
//
// Autorización (mismo patrón que /api/invoices/run-monthly):
//  - Cron de Vercel: se invoca desde la plataforma; se autoriza usando la
//    service role (omite RLS) cuando está configurada. También admite el header
//    `x-cron-secret` == CRON_SECRET como capa extra opcional.
//  - Botón manual: POST con sesión de equipo (admin/manager/member) autenticada.
export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}

async function run(request: Request) {
  try {
    const authHeader = request.headers.get("x-cron-secret")
    const hasCronSecret =
      process.env.CRON_SECRET && authHeader && authHeader === process.env.CRON_SECRET

    // Permitido desde el cron (con service role o con secret) o desde una sesión
    // de equipo autenticada (botón del dashboard).
    if (!hasCronSecret && !isServiceRoleConfigured()) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      const role = profile?.role
      if (!role || role === "client") {
        return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 })
      }
    }

    const maxTasks = Number(new URL(request.url).searchParams.get("max") ?? 20)
    const result = await processTaskBatch(Math.min(Math.max(maxTasks, 1), 50))

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("ai-tasks run error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    )
  }
}
