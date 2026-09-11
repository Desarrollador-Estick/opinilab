import { NextResponse } from "next/server"
import {
  isCronRequestAuthorized,
  requireCronOrTeamAuth,
  unauthorizedResponse,
} from "@/lib/cron-auth"
import { runAutomationFull } from "@/lib/automation/run"

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return unauthorizedResponse()
  }
  const result = await runAutomationFull(new Date())
  return NextResponse.json(result)
}

// Ejecución manual desde el dashboard (sesión de equipo) o con header de cron.
export async function POST(request: Request) {
  const denied = await requireCronOrTeamAuth(request)
  if (denied) return denied
  const result = await runAutomationFull(new Date())
  return NextResponse.json(result)
}