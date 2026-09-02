import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getQuotaStatus } from "@/lib/ai/ai-tasks"
import { AddTaskForm } from "./add-form"
import { AI_TASK_LABEL, AI_TASK_STATUS_LABEL, AiTaskCategory } from "./constants"

const CATEGORY_ORDER: AiTaskCategory[] = [
  "reviews",
  "seo",
  "email",
  "social_media",
  "ads",
  "branding",
  "web",
]

export default async function TareasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/portal/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.client_id) redirect("/dashboard")
  const clientId = profile.client_id

  const [{ data: client }, { data: clientServices }, { data: tasks }, quota] =
    await Promise.all([
      supabase.from("clients").select("business_name").eq("id", clientId).maybeSingle(),
      supabase
        .from("client_services")
        .select("id, services!inner(category)")
        .eq("client_id", clientId)
        .eq("status", "active"),
      supabase
        .from("ai_tasks")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      getQuotaStatus(),
    ])

  const categories = new Set<AiTaskCategory>()
  for (const cs of clientServices ?? []) {
    const svc = Array.isArray(cs.services) ? cs.services[0] : cs.services
    if (svc?.category) categories.add(svc.category as AiTaskCategory)
  }
  const available = CATEGORY_ORDER.filter((c) => categories.has(c))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis tareas con IA</h2>
        <p className="text-gray-500 mt-1">
          {client?.business_name ? `${client.business_name} — ` : ""}solicita contenido y entregables
          de los servicios que tienes contratados. Los genera nuestra IA y se completan por orden.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">¿Cómo funciona?</p>
        <p>
          Cada tarea entra en una cola y se procesa de una en una, en el orden en que la pides.
          Las tareas son <strong>gratuitas</strong> hasta completar el cupo activo. Si el cupo se
          agota, tu tarea pasa a la <strong>lista de espera</strong> y se cumple automáticamente
          en cuanto se reactive el cupo.
        </p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-white rounded-lg p-2">
            <div className="text-xl font-bold text-blue-700">{quota.quota}</div>
            <div className="text-xs text-gray-500">Cupo total</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xl font-bold text-gray-700">{quota.consumed}</div>
            <div className="text-xs text-gray-500">Usadas</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className={`text-xl font-bold ${quota.exhausted ? "text-amber-600" : "text-green-600"}`}>
              {quota.remaining}
            </div>
            <div className="text-xs text-gray-500">Disponibles</div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className={`text-xl font-bold ${quota.exhausted ? "text-red-600" : "text-gray-700"}`}>
              {quota.exhausted ? "Agotado" : "Activo"}
            </div>
            <div className="text-xs text-gray-500">Estado</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Solicitar una tarea</h3>
        <AddTaskForm categories={available} quotaExhausted={quota.exhausted} />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Historial de tareas</h3>
        {!tasks || tasks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-sm">
            Todavía no has solicitado ninguna tarea.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-gray-900">
                      {AI_TASK_LABEL[task.service_category as AiTaskCategory]}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.created_at).toLocaleString("es-ES")}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      task.status === "done"
                        ? "bg-green-100 text-green-700"
                        : task.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : task.status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : task.status === "waiting"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {AI_TASK_STATUS_LABEL[task.status] ?? task.status}
                  </span>
                </div>

                {task.request_note && (
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="text-gray-400">Nota:</span> {task.request_note}
                  </p>
                )}

                {task.result && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {task.result}
                  </div>
                )}
                {task.error && (
                  <div className="mt-3 bg-red-50 rounded-lg p-3 text-sm text-red-700">
                    {task.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
