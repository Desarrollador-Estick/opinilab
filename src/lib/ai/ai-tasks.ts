// Núcleo de la cola de tareas IA (Groq) asignadas por el cliente.
//
// Modelo de CUPO gratis:
//   - `ai_free_quota`   (settings): total de tareas gratis permitidas (configurable).
//   - `ai_tasks_consumed` (settings): contador de tareas ya consumidas.
//   Cuando `consumed >= quota` → las nuevas tareas pasan a `waiting` (lista de
//   espera) y no se ejecutan hasta que el admin "reactiva" el cupo (recarga o
//   sube la cuota), momento en que el worker vuelve a procesarlas de una en una
//   y por orden (consecutivas).
//
// El worker procesa SOLO UNA tarea por invocación (la más antigua en cola),
// garantizando que nunca hay dos llamadas a Groq en paralelo y que el orden se
// respeta por fecha de creación.

import type { SupabaseClient } from "@supabase/supabase-js"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { dispatchServiceContent, ServiceClient } from "@/lib/ai/dispatch"
import { Database } from "@/types/database"

type Db = SupabaseClient<Database>

type AiTaskCategory = Database["public"]["Tables"]["ai_tasks"]["Insert"]["service_category"]
type AiTaskStatus = Database["public"]["Tables"]["ai_tasks"]["Insert"]["status"]

export const AI_TASK_CATEGORIES: AiTaskCategory[] = [
  "reviews",
  "seo",
  "email",
  "social_media",
  "ads",
  "branding",
  "web",
]

const SETTING_QUOTA = "ai_free_quota"
const SETTING_CONSUMED = "ai_tasks_consumed"

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return isNaN(n) ? fallback : n
}

async function getSettingsValue(client: Db, key: string): Promise<number> {
  const { data } = await client.from("settings").select("value").eq("key", key).maybeSingle()
  return toNumber(data?.value, 0)
}

export type QuotaStatus = {
  quota: number
  consumed: number
  remaining: number
  exhausted: boolean
}

// Devuelve el estado actual del cupo de tareas gratis.
export async function getQuotaStatus(client?: Db): Promise<QuotaStatus> {
  const c = client ?? (await createServerAdminClient())
  const [quota, consumed] = await Promise.all([
    getSettingsValue(c, SETTING_QUOTA),
    getSettingsValue(c, SETTING_CONSUMED),
  ])
  const remaining = Math.max(0, quota - consumed)
  return { quota, consumed, remaining, exhausted: quota > 0 && remaining <= 0 }
}

// Consume una unidad de cupo. Solo cuando una tarea se ejecuta de verdad.
export async function consumeQuota(client?: Db): Promise<void> {
  const c = client ?? (await createServerAdminClient())
  const consumed = await getSettingsValue(c, SETTING_CONSUMED)
  const { error } = await c
    .from("settings")
    .update({ value: consumed + 1, updated_at: new Date().toISOString() })
    .eq("key", SETTING_CONSUMED)
  if (error) throw new Error(`No se pudo actualizar el cupo consumido: ${error.message}`)
}

// Recarga el cupo consumido (reactiva la lista de espera). Devuelve la nueva
// cuota consumida. "reactivar" = volver el contador a un valor menor que la cuota.
export async function reactivateQuota(client?: Db): Promise<void> {
  const c = client ?? (await createServerAdminClient())
  const { error } = await c
    .from("settings")
    .update({ value: 0, updated_at: new Date().toISOString() })
    .eq("key", SETTING_CONSUMED)
  if (error) throw new Error(`No se pudo reactivar el cupo: ${error.message}`)
}

export type AiTaskCore = {
  id: string
  client_id: string
  client_service_id: string | null
  service_category: AiTaskCategory
  status: AiTaskStatus
  request_note: string | null
  created_at: string
}

// Procesa las tareas en cola de forma consecutiva (una tras otra, por orden de
// creación) hasta cumplir un límite de lote o hasta que se agote el cupo.
// Al empezar, si hay cupo disponible, promueve tareas "waiting" de nuevo a la
// cola para que, al reactivar el cupo, la lista de espera se vaya cumpliendo.
// Devuelve un resumen de lo procesado.
export async function processTaskBatch(maxTasks = 20): Promise<{
  processed: number
  failed: number
  waiting: number
  exhausted: boolean
}> {
  const admin = await createServerAdminClient()

  const quota = await getQuotaStatus(admin)

  // Sin cupo configurado o agotado → todo pendiente a lista de espera.
  if (quota.quota <= 0 || quota.exhausted) {
    await markQueuedAsWaiting(admin)
    return { processed: 0, failed: 0, waiting: await countWaiting(admin), exhausted: true }
  }

  // Promueve "waiting" → "queued" hasta completar el cupo restante.
  if (quota.remaining > 0) {
    const { data: waitingTasks } = await admin
      .from("ai_tasks")
      .select("id")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(Math.min(quota.remaining, maxTasks))
    if (waitingTasks && waitingTasks.length > 0) {
      const ids = waitingTasks.map((t: { id: string }) => t.id)
      await admin.from("ai_tasks").update({ status: "queued" }).in("id", ids)
    }
  }

  let processed = 0
  let failed = 0

  while (processed < maxTasks) {
    // Bloqueo: si ya hay una tarea en "processing" (otra instancia), paramos.
    const { data: inProgress } = await admin
      .from("ai_tasks")
      .select("id")
      .eq("status", "processing")
      .limit(1)
    if (inProgress && inProgress.length > 0) break

    const status = await getQuotaStatus(admin)
    if (status.quota <= 0 || status.exhausted) {
      await markQueuedAsWaiting(admin)
      break
    }

    const { data: task } = await admin
      .from("ai_tasks")
      .select(
        "id, client_id, client_service_id, service_category, status, request_note, created_at"
      )
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!task) break

    const outcome = await executeTask(admin, task)
    processed += 1
    if (outcome === "failed") failed += 1
  }

  return { processed, failed, waiting: await countWaiting(admin), exhausted: false }
}

async function countWaiting(admin: Db): Promise<number> {
  const { count } = await admin
    .from("ai_tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting")
  return count ?? 0
}

async function executeTask(admin: Db, task: AiTaskCore): Promise<"done" | "failed"> {
  const mark = await admin
    .from("ai_tasks")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", task.id)
    .eq("status", "queued")
  if (mark.error) {
    console.error("[ai-tasks] Error marcando tarea:", mark.error.message)
    return "failed"
  }

  try {
    await consumeQuota(admin)

    const { data: client } = await admin
      .from("clients")
      .select("id, business_name, contact_name, google_maps_url, notes, industry")
      .eq("id", task.client_id)
      .maybeSingle()
    if (!client) throw new Error("Cliente no encontrado")

    let reviewData: {
      rating?: number | null
      reviewer_name?: string | null
      review_text?: string | null
    } | null = null
    if (task.service_category === "reviews") {
      const { data: r } = await admin
        .from("reviews")
        .select("rating, reviewer_name, review_text")
        .eq("client_id", task.client_id)
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      reviewData = r ?? null
    }

    const res = await dispatchServiceContent({
      client: client as ServiceClient,
      category: task.service_category,
      review: reviewData,
    })

    if (res.ok) {
      const finish = await admin
        .from("ai_tasks")
        .update({
          status: "done",
          result: res.content,
          error: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", task.id)
      if (finish.error) console.error("[ai-tasks] Error guardando resultado:", finish.error.message)
      return "done"
    }

    const finish = await admin
      .from("ai_tasks")
      .update({
        status: "failed",
        error: res.error,
        processed_at: new Date().toISOString(),
      })
      .eq("id", task.id)
    if (finish.error) console.error("[ai-tasks] Error guardando fallo:", finish.error.message)
    return "failed"
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error interno al procesar tarea"
    await admin
      .from("ai_tasks")
      .update({ status: "failed", error: msg, processed_at: new Date().toISOString() })
      .eq("id", task.id)
    console.error("[ai-tasks] Error procesando tarea:", msg)
    return "failed"
  }
}

// Mantiene compatibilidad: procesa una sola tarea en cola (consecutiva).
export async function processNextTask() {
  const result = await processTaskBatch(1)
  return {
    processed: result.processed > 0,
    failed: result.failed > 0,
    waiting: result.waiting,
    exhausted: result.exhausted,
  }
}

// Marca todas las tareas "queued" como "waiting" (lista de espera por cupo agotado).
async function markQueuedAsWaiting(admin: Db) {
  const { error } = await admin
    .from("ai_tasks")
    .update({ status: "waiting" })
    .eq("status", "queued")
  if (error) console.error("[ai-tasks] Error moviendo tareas a espera:", error.message)
}
