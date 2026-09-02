"use server"

import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { getQuotaStatus } from "@/lib/ai/ai-tasks"
import { Database } from "@/types/database"

type AiTaskCategory = Database["public"]["Tables"]["ai_tasks"]["Insert"]["service_category"]

export type AiTaskState = {
  error?: string
  success?: boolean
  waiting?: boolean
  message?: string
}

async function getOwnClientId(supabase: SupabaseClient<Database>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "client" || !profile?.client_id) return null
  return profile.client_id as string
}

// El cliente asigna una tarea de IA vinculada a uno de sus servicios contratados.
// Si el cupo gratis está agotado, la tarea entra en la LISTA DE ESPERA (waiting)
// y se cumplirá cuando el admin reactive el cupo.
export async function addAiTaskAction(formData: FormData): Promise<AiTaskState> {
  const supabase = await createClient()
  const clientId = await getOwnClientId(supabase)
  if (!clientId) return { error: "No tienes permisos para asignar tareas." }

  const serviceCategory = formData.get("service_category") as AiTaskCategory
  const requestNote = ((formData.get("request_note") as string) || "").trim() || null

  const allowed: AiTaskCategory[] = [
    "reviews",
    "seo",
    "email",
    "social_media",
    "ads",
    "branding",
    "web",
  ]
  if (!serviceCategory || !allowed.includes(serviceCategory)) {
    return { error: "Selecciona el tipo de tarea." }
  }

  // Verifica que el cliente tenga un servicio contratado de esa categoría.
  const { data: clientServices } = await supabase
    .from("client_services")
    .select("id, services!inner(category)")
    .eq("client_id", clientId)
    .eq("status", "active")
  const categories = new Set<string>()
  for (const cs of clientServices ?? []) {
    const svc = Array.isArray(cs.services) ? cs.services[0] : cs.services
    if (svc?.category) categories.add(svc.category)
  }
  if (!categories.has(serviceCategory)) {
    return { error: "No tienes contratado un servicio de este tipo." }
  }

  // Estado inicial según cupo disponible.
  const quota = await getQuotaStatus(await createServerAdminClient())
  const goToWaiting = quota.quota > 0 && quota.exhausted
  const status = goToWaiting ? "waiting" : "queued"

  const { error } = await supabase.from("ai_tasks").insert({
    client_id: clientId,
    service_category: serviceCategory,
    request_note: requestNote,
    status,
  })
  if (error) return { error: error.message }

  revalidatePath("/portal/tareas")
  return {
    success: true,
    waiting: status === "waiting",
    message:
      status === "waiting"
        ? "La tarea se ha añadido a la lista de espera. Se procesará en cuanto se reactive el cupo de tareas gratis."
        : "Tarea en cola. Se procesará enseguida.",
  }
}
