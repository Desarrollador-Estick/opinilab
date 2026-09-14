import { createServerAdminClient } from "@/lib/supabase/admin"
import { generateContractNumber } from "@/lib/utils"

/**
 * Genera y guarda el contrato de alta del cliente en cuanto se le asigna su
 * primer servicio. Crea un contrato en estado "draft" con la plantilla estándar
 * rellenada con los datos del cliente y el servicio.
 * Tolerante a fallos: cualquier error solo devuelve ok:false.
 */

export type CreateOnboardingContractResult = {
  ok: boolean
  error?: string
  id?: string
}

export async function createOnboardingContract(opts: {
  clientId: string
  businessName: string
  contactName?: string | null
  serviceName?: string
  value?: number | null
}): Promise<CreateOnboardingContractResult> {
  try {
    const admin = await createServerAdminClient()

    const { count } = await admin
      .from("contracts")
      .select("id", { count: "exact", head: true })

    const year = new Date().getFullYear()
    const sequence = (count ?? 0) + 1
    const contractNumber = generateContractNumber(year, sequence)

    const content = buildContractContent(opts)

    const { data, error } = await admin
      .from("contracts")
      .insert({
        client_id: opts.clientId,
        contract_number: contractNumber,
        title: `Contrato de respuesta automática a reseñas - ${opts.businessName}`,
        content,
        status: "draft",
        value: opts.value ?? 0,
        start_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message || "Sin datos al crear el contrato" }
    }

    return { ok: true, id: data.id }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error creando el contrato de onboarding",
    }
  }
}

function buildContractContent(opts: {
  clientId: string
  businessName: string
  contactName?: string | null
  serviceName?: string
  value?: number | null
}): string {
  const today = new Date().toLocaleDateString("es-ES")
  const company = process.env.COMPANY_NAME || "OpiniLab"
  const service = opts.serviceName || "Respuesta automática a reseñas de Google Business Profile"
  const value = opts.value
    ? `${Number(opts.value).toLocaleString("es-ES")} euros (IVA incluido)`
    : "el importe acordado entre las partes"

  return `CONTRATO DE PRESTACIÓN DE SERVICIOS DE RESPUESTA AUTOMÁTICA A RESEÑAS DE GOOGLE

Entre las partes:

PRESTADOR: ${company} (CIF: ${process.env.COMPANY_NIF || "B00000000"})

CLIENTE: ${opts.businessName}${opts.contactName ? `, representado por ${opts.contactName}` : ""}.

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de respuesta automática a reseñas de Google Business Profile mediante inteligencia artificial por parte del Prestador para el Cliente. El servicio consiste en la gestión integral de las reseñas que los clientes del Negocio publican en su ficha de Google, incluyendo la generación automática de respuestas personalizadas, la solicitud proactiva de nuevas reseñas y el seguimiento de la reputación online.

2. DURACIÓN
El contrato tendrá una duración desde el ${today}, renovable por periodos iguales salvo notificación en contrario con 30 días de antelación.

3. SERVICIOS INCLUIDOS
El servicio incluye:
   a) Respuesta automática con IA a todas las reseñas de Google (positivas y negativas).
   b) Personalización del tono de respuesta según las directrices del Cliente.
   c) Solicitud automática de reseñas a los clientes del Negocio.
   d) Panel de control para visualizar reseñas, respuestas e historial.
   e) Informe mensual de evolución de la reputación en Google.

4. PRECIO Y FORMA DE PAGO
El precio total del contrato asciende a ${value}, pagadero según la frecuencia acordada. El Primer pago incluye la mensualidad del mes corriente y la cuota de gestión de datos (alta del servicio).

5. ACCESO AL PERFIL DE GOOGLE
El Cliente facilitará el enlace a su ficha de Google Business Profile. El Prestador NO solicitará acceso a la cuenta de Google del Cliente. Las respuestas generadas por la IA serán publicadas por el Cliente o, en su caso, por el Prestador con autorización explícita.

6. CONFIDENCIALIDAD
Ambas partes se comprometen a mantener la confidencialidad de toda la información compartida durante la vigencia del contrato y durante un periodo de 2 años tras su finalización.

7. TRATAMIENTO DE DATOS
El Prestador tratará los datos personales del Cliente y de los usuarios que dejen reseñas únicamente para la prestación de los servicios contratados, de conformidad con el RGPD. Las respuestas generadas por IA se publican en la plataforma Google y son visibles públicamente.

8. TERMINACIÓN
Cualquiera de las partes podrá dar por terminado el contrato con un preaviso de 30 días por escrito.

Firmado en Madrid, a día de ${today}.

_______________________________
Por el Prestador (${company})

_______________________________
Por el Cliente (${opts.businessName})`
}
