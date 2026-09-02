import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getQuotaStatus } from "@/lib/ai/ai-tasks"
import { QuotaControls } from "./quota-controls"
import { AI_TASK_LABEL, AI_TASK_STATUS_LABEL, AiTaskCategory } from "@/app/portal/tareas/constants"

export default async function AiTareasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || profile.role === "client") redirect("/dashboard")

  const [quota, tasksResult, counts] = await Promise.all([
    getQuotaStatus(),
    supabase
      .from("ai_tasks")
      .select("*, clients(business_name)")
      .order("created_at", { ascending: true }),
    supabase.from("ai_tasks").select("status"),
  ])

  const countBy = { queued: 0, waiting: 0, processing: 0, done: 0, failed: 0 }
  for (const t of counts.data ?? []) {
    const s = t.status as keyof typeof countBy
    if (s in countBy) countBy[s]++
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tareas IA de los clientes</h1>
        <p className="text-gray-500 mt-1">
          Cola de contenido generado con Groq. Las tareas se procesan de una en una, por orden. Si el
          cupo se agota, las nuevas pasan a la lista de espera hasta que lo reactives.
        </p>
      </div>

      {/* Resumen de estados + cupo */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{quota.remaining}</div>
          <div className="text-xs text-gray-500">Cupo restante</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{countBy.queued}</div>
          <div className="text-xs text-gray-500">En cola</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{countBy.waiting}</div>
          <div className="text-xs text-gray-500">En espera</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{countBy.processing}</div>
          <div className="text-xs text-gray-500">Procesando</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{countBy.done}</div>
          <div className="text-xs text-gray-500">Completadas</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{countBy.failed}</div>
          <div className="text-xs text-gray-500">Errores</div>
        </div>
      </div>

      <QuotaControls quota={quota.quota} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Lista de tareas</h2>
        {!tasksResult.data || tasksResult.data.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            No hay tareas IA todavía.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tarea</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Creada</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasksResult.data.map((task) => {
                  const business =
                    (Array.isArray(task.clients) ? task.clients[0] : task.clients)?.business_name ??
                    "—"
                  return (
                    <tr key={task.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{business}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {AI_TASK_LABEL[task.service_category as AiTaskCategory] ??
                          task.service_category}
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(task.created_at).toLocaleString("es-ES")}
                      </td>
                      <td className="px-4 py-3">
                        {task.result ? (
                          <details>
                            <summary className="text-blue-600 cursor-pointer text-xs font-medium">
                              Ver resultado
                            </summary>
                            <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap">
                              {task.result}
                            </pre>
                          </details>
                        ) : task.error ? (
                          <span className="text-red-600 text-xs">{task.error}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
