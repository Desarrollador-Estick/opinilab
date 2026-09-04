import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AddToolForm } from "./add-form"
import { ToolList } from "./tool-list"
import { TOOL_TYPE_LABEL } from "./constants"

export default async function HerramientasPage() {
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

  const [{ data: client }, { data: tools }] = await Promise.all([
    supabase.from("clients").select("business_name").eq("id", clientId).maybeSingle(),
    supabase
      .from("client_tools")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Mis herramientas
        </h2>
        <p className="text-lg mt-2" style={{ color: "var(--color-muted-foreground)" }}>
          Deja aquí los accesos que necesitamos para trabajar en tu cuenta.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
        <p className="font-semibold text-blue-900 mb-1">¿Por qué necesitamos estos accesos?</p>
        <p className="text-sm text-blue-700">
          Para gestionar los servicios contratados necesitamos acceso a tus herramientas.
          Puedes añadir tu <strong>Google Business Profile</strong>, redes sociales, anuncios,
          web o email marketing. Los datos solo los usa nuestro equipo y no se comparten.
          Puedes borrarlos cuando quieras y cambiar la contraseña desde cada plataforma cuando prefieras.
        </p>
      </div>

      {/* Add Form */}
      <AddToolForm clientId={clientId} />

      {/* Tool List */}
      <ToolList
        clientId={clientId}
        tools={tools ?? []}
        typeLabel={TOOL_TYPE_LABEL}
      />
    </div>
  )
}
