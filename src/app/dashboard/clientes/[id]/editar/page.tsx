import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getClient } from "@/lib/supabase/queries"
import EditarClienteForm from "./editar-form"

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client, error } = await getClient(supabase, id)
  if (error || !client) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/clientes/${client.id}`}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Volver al cliente
        </Link>
        <h2 className="text-2xl font-bold mt-2">Editar Cliente</h2>
        <p className="text-gray-500">
          Modifica los datos de {client.business_name}
        </p>
      </div>

      <EditarClienteForm client={client} />
    </div>
  )
}
