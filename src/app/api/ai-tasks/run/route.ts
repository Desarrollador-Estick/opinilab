import { NextResponse } from "next/server"
import { isServiceRoleConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isCronRequestAuthorized, unauthorizedResponse } from "@/lib/cron-auth"
import { processTaskBatch } from "@/lib/ai/ai-tasks"

// Worker de la cola de tareas IA. Procesa las tareas de forma consecutiva
// (invocando Groq de una en una), hasta cumplir el lote o agotar el cupo.
// Si el cupo gratis se agota, las tareas restantes pasan a "waiting" y esperan
// a que el admin reactive el cupo para volver a procesarse en orden.
//
// Autorización:
//  - Cron de Vercel: Vercel envía automáticamente `authorization: Bearer
//    <CRON_SECRET>` si la variable está definida; también se acepta el header
//    legacy `x-cron-secret`. Con la service role configurada el cron de Vercel
//    funcionaba sin header (backward-compat mientras no exista CRON_SECRET).
//  - Botón manual: POST con sesión de equipo (admin/manager/member) autenticada.
export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}

async function run(request: Request) {
  try {
    const cronOk = isCronRequestAuthorized(request)

    // Permitido desde el cron (header válido o service role) o desde una sesión
    // de equipo autenticada (botón del dashboard).
    if (!cronOk && !isServiceRoleConfigured()) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return unauthorizedResponse()
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
