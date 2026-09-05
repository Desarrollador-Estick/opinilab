import { NextResponse } from "next/server"
import { requireCronOrTeamAuth } from "@/lib/cron-auth"
import { processTaskBatch } from "@/lib/ai/ai-tasks"

// Worker de la cola de tareas IA. Procesa las tareas de forma consecutiva
// (invocando Groq de una en una), hasta cumplir el lote o agotar el cupo.
// Si el cupo gratis se agota, las tareas restantes pasan a "waiting" y esperan
// a que el admin reactive el cupo para volver a procesarse en orden.
//
// Autorización:
//  - Cron de Vercel: Vercel envía automáticamente `authorization: Bearer
//    <CRON_SECRET>` si la variable está definida; también se acepta el header
//    legacy `x-cron-secret`.
//  - Botón manual: POST con sesión de equipo (admin/manager/member) autenticada.
export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}

async function run(request: Request) {
  try {
    const errorResponse = await requireCronOrTeamAuth(request)
    if (errorResponse) {
      return errorResponse
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
