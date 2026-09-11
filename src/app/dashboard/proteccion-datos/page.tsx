import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServerAdminClient } from "@/lib/supabase/admin"
import PrivacyRequestsList from "./privacy-requests-list"

export default async function ProteccionDatosPage() {
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

  const admin = await createServerAdminClient()
  const [requestsRes, leadsRes, suppressionsRes] = await Promise.all([
    admin.from("privacy_requests").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("leads").select("status, email"),
    admin.from("email_suppressions").select("email"),
  ])

  const requests = requestsRes.data ?? []

  const leads = leadsRes.data ?? []
  const totalLeads = leads.length
  const lostLeads = leads.filter((l) => l.status === "lost").length
  const anonymized = leads.filter((l) => !l.email).length

  const checklist = [
    {
      ok: true,
      title: "Pie legal en emails comerciales",
      detail: "Identidad del responsable, base de interés legítimo, enlace de baja (oposición gratuita) y política de privacidad.",
    },
    {
      ok: true,
      title: "Consentimiento de analítica",
      detail: "La analítica (visitas/clics) solo se activa tras aceptar la cookie de consentimiento. Sin cookies ni rastreadores sin aceptación previa.",
    },
    {
      ok: true,
      title: "Registro de derechos (ARCO + RGPD)",
      detail: "Formulario público en /proteccion-datos. Las solicitudes de supresión/oposición/baja borran los datos asociados al email al resolverlas.",
    },
    {
      ok: true,
      title: "Retención automática de datos",
      detail: "Leads sin interés legítimo se anonimizan a los 120 días. Registros de navegación >12 meses y de email >24 meses se purgan (se ejecuta en cada automatización).",
    },
    {
      ok: true,
      title: "ROPA e informe de protección de datos",
      detail: `Documento completo en docs/proteccion-datos/INFORME_PROTECCION_DATOS.md con registro de actividades, encargados (DPA) y transferencias.`,
    },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Protección de datos</h1>
        <p className="text-gray-500 mt-1">
          Informe de cumplimiento RGPD y LSSI-CE del sistema de captación. Estado al{" "}
          {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalLeads}</div>
          <div className="text-xs text-gray-500">Leads en base</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{lostLeads}</div>
          <div className="text-xs text-gray-500">Lost (anonimizables en 120 días)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{anonymized}</div>
          <div className="text-xs text-gray-500">Leads ya anonimizados</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{(suppressionsRes.data ?? []).length}</div>
          <div className="text-xs text-gray-500">Emails dados de baja</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Checklist de cumplimiento</h2>
        <ul className="space-y-3">
          {checklist.map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{c.title}</p>
                <p className="text-sm text-gray-500">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          Informe completo (ROPA) en el repositorio: <code className="text-gray-700">docs/proteccion-datos/INFORME_PROTECCION_DATOS.md</code>. Página pública:{" "}
          <Link href="/proteccion-datos" className="text-blue-600 underline">/proteccion-datos</Link>.
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Solicitudes de derechos</h2>
        <p className="text-sm text-gray-500 mb-4">
          Resolver una supresión/oposición/baja borra réplicas y envíos del email, anonimiza sus leads y añade el email a la lista de bajas (ya no recibe emails comerciales).
        </p>
        <PrivacyRequestsList requests={requests} />
      </div>
    </div>
  )
}