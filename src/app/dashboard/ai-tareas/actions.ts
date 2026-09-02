"use server"

import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import { reactivateQuota, processTaskBatch } from "@/lib/ai/ai-tasks"
import { Database } from "@/types/database"

export type AiTasksAdminState = {
  error?: string
  success?: boolean
  message?: string
}

async function assertAgency(supabase: SupabaseClient<Database>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  return ["admin", "manager", "member"].includes(profile?.role ?? "")
}

// Reactiva el cupo: resetea el contador consumido a 0 para que la lista de
// espera vuelva a procesarse automáticamente en el siguiente run del worker
// (o ahora mismo con "Procesar ahora").
export async function reactivateQuotaAction(): Promise<AiTasksAdminState> {
  const supabase = await createClient()
  if (!(await assertAgency(supabase))) return { error: "No tienes permisos." }

  try {
    await reactivateQuota(await createServerAdminClient())
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error al reactivar el cupo" }
  }

  revalidatePath("/dashboard/ai-tareas")
  revalidatePath("/dashboard/configuracion")
  return { success: true, message: "Cupo reactivado. Las tareas en espera se procesarán por orden." }
}

// Guarda el nuevo cupo total de tareas gratis.
export async function updateQuotaAction(formData: FormData): Promise<AiTasksAdminState> {
  const supabase = await createClient()
  if (!(await assertAgency(supabase))) return { error: "No tienes permisos." }

  const value = Number(formData.get("quota"))
  if (isNaN(value) || value < 0) return { error: "El cupo debe ser un número mayor o igual a 0." }

  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "ai_free_quota", value: value, category: "ia", description: "Cupo total de tareas IA gratis por ciclo" },
      { onConflict: "key" }
    )
  if (error) return { error: error.message }

  revalidatePath("/dashboard/ai-tareas")
  return { success: true, message: "Cupo actualizado." }
}

// Procesa ahora un lote de tareas en cola (desde el panel).
export async function processNowAction(): Promise<AiTasksAdminState> {
  const supabase = await createClient()
  if (!(await assertAgency(supabase))) return { error: "No tienes permisos." }
  const result = await processTaskBatch(10)
  revalidatePath("/dashboard/ai-tareas")
  return {
    success: true,
    message: `Procesadas ${result.processed} tarea(s), ${result.failed} con error. ${
      result.waiting > 0 ? `${result.waiting} en lista de espera.` : ""
    }`,
  }
}
