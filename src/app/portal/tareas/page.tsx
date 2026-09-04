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

  const [{ data: client }, { data: clientServices }, { data: ai_tasks }, { data: allServices }, quota] =
    await Promise.all([
      supabase.from("clients").select("business_name").eq("id", clientId).maybeSingle(),
      supabase.from("client_services").select("id, service_id, status").eq("client_id", clientId).eq("status", "active"),
      supabase.from("ai_tasks").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("services").select("id, category").eq("is_active", true),
      getQuotaStatus(),
    ])

  const categories = new Set<AiTaskCategory>()
  for (const cs of clientServices ?? []) {
    const svc = allServices?.find((s) => s.id === cs.service_id)
    if (svc?.category) categories.add(svc.category as AiTaskCategory)
  }
  const available = CATEGORY_ORDER.filter((c) => categories.has(c))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Mis tareas con IA
        </h2>
        <p className="text-lg mt-2" style={{ color: "var(--color-muted-foreground)" }}>
          {client?.business_name ? `${client.business_name} — ` : ""}solicita contenido y entregables
          de los servicios que tienes contratados. Los genera nuestra IA y se completan por orden.
        </p>
      </div>

      {/* Quota Dashboard */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
        <p className="font-semibold text-blue-900 mb-1">¿Cómo funciona?</p>
        <p className="text-sm text-blue-700">
          Cada tarea entra en una cola y se procesa de una en una, en el orden en que la pides.
          Las tareas son <strong>gratuitas</strong> hasta completar el cupo activo. Si el cupo se
          agota, tu tarea pasa a la <strong>lista de espera</strong> y se cumple automáticamente
          en cuanto se reactive el cupo.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-blue-100 text-center">
            <div className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>{quota.quota}</div>
            <div className="text-xs font-medium text-gray-500 mt-1">Cupo total</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100 text-center">
            <div className="text-2xl font-extrabold" style={{ color: "var(--color-foreground)" }}>{quota.consumed}</div>
            <div className="text-xs font-medium text-gray-500 mt-1">Usadas</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100 text-center">
            <div className={`text-2xl font-extrabold ${quota.exhausted ? "text-amber-600" : "text-green-600"}`}>
              {quota.remaining}
            </div>
            <div className="text-xs font-medium text-gray-500 mt-1">Disponibles</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100 text-center">
            <div className={`text-2xl font-extrabold ${quota.exhausted ? "text-red-600" : "text-green-600"}`}>
              {quota.exhausted ? "Agotado" : "Activo"}
            </div>
            <div className="text-xs font-medium text-gray-500 mt-1">Estado</div>
          </div>
        </div>
      </div>

      {/* Request Form */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-bold text-lg" style={{ color: "var(--color-foreground)" }}>
            ✨ Solicitar una tarea
          </h3>
        </div>
        <div className="p-6">
          <AddTaskForm categories={available} quotaExhausted={quota.exhausted} />
        </div>
      </section>

      {/* History */}
      <section>
        <h3 className="font-bold text-lg mb-4" style={{ color: "var(--color-foreground)" }}>
          📋 Historial de tareas
        </h3>
        {!ai_tasks || ai_tasks.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
            Todavía no has solicitado ninguna tarea.
          </div>
        ) : (
          <div className="space-y-3">
            {ai_tasks.map((task) => (
              <div key={task.id} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold" style={{ color: "var(--color-foreground)" }}>
                      {AI_TASK_LABEL[task.service_category as AiTaskCategory]}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
                      {new Date(task.created_at).toLocaleString("es-ES")}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
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
                  <p className="text-sm mt-2" style={{ color: "var(--color-muted-foreground)" }}>
                    <span className="font-medium">Nota:</span> {task.request_note}
                  </p>
                )}

                {task.result && (
                  <div className="mt-3 bg-[var(--color-muted)] rounded-xl p-4 text-sm whitespace-pre-wrap" style={{ color: "var(--color-foreground)" }}>
                    {task.result}
                  </div>
                )}
                {task.error && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {task.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
