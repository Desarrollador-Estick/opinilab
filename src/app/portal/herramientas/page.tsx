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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mis herramientas</h2>
        <p className="text-gray-500 mt-1">
          Deja aquí los accesos que necesitamos para trabajar en tu cuenta.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">¿Por qué necesitamos estos accesos?</p>
        <p>
          Para gestionar los servicios contratados necesitamos acceso a tus herramientas.
          Puedes añadir tu <strong>Google Business Profile</strong>, redes sociales, anuncios,
          web o email marketing. Los datos solo los usa nuestro equipo y no se comparten.
          Puedes borrarlos cuando quieras y cambiar la contraseña desde cada plataforma cuando prefieras.
        </p>
      </div>

      <AddToolForm clientId={clientId} />

      <ToolList
        clientId={clientId}
        tools={tools ?? []}
        typeLabel={TOOL_TYPE_LABEL}
      />
    </div>
  )
}