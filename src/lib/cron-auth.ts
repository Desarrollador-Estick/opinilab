import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Verifica que una petición de cron está autorizada.
 *
 * Vercel añade automáticamente el header `authorization: Bearer <CRON_SECRET>`
 * cuando la variable de entorno CRON_SECRET está definida en el proyecto, por lo
 * que los crons del dashboard NO necesitan headers manuales en vercel.json
 * (añadir `Bearer ${CRON_SECRET}` literal enviaría el texto sin interpolar y
 * rompería la autenticación).
 *
 * Acepta también el header legacy `x-cron-secret` para invocaciones externas.
 *
 * Backward-compat: si CRON_SECRET no está definida todavía en producción se
 * permite la petición (mismo comportamiento actual), para no romper los crons
 * antes de añadir la variable en Vercel.
 */
export function isCronRequestAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // No configurado: no romper los crons existentes (se documenta que hay que
    // añadir CRON_SECRET en Vercel).
    return true
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  const legacyHeader = request.headers.get("x-cron-secret")
  if (legacyHeader === cronSecret) {
    return true
  }

  return false
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}

/**
 * Para endpoints invocados tanto por el cron (header Bearer) como por botones
 * del dashboard (sesión de equipo), se acepta cualquiera de los dos:
 *  - header de cron válido (Bearer/x-cron-secret), o
 *  - sesión de equipo autenticada (admin/manager/member).
 * Devuelve null si está autorizado, o la respuesta de error a devolver.
 */
export async function requireCronOrTeamAuth(
  request: Request
): Promise<NextResponse | null> {
  if (isCronRequestAuthorized(request)) {
    return null
  }

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
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  return null
}