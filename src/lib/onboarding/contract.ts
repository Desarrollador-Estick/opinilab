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
        title: `Contrato de prestación de servicios - ${opts.businessName}`,
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
  const service = opts.serviceName || "los servicios de marketing digital contratados"
  const value = opts.value
    ? `${Number(opts.value).toLocaleString("es-ES")} euros (IVA incluido)`
    : "el importe acordado entre las partes"

  return `CONTRATO DE PRESTACIÓN DE SERVICIOS DE MARKETING DIGITAL

Entre las partes:

PRESTADOR: ${company} (CIF: ${process.env.COMPANY_NIF || "B00000000"})

CLIENTE: ${opts.businessName}${opts.contactName ? `, representado por ${opts.contactName}` : ""}.

1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de marketing digital por parte del Prestador para el Cliente, sin perjuicio de los detalles y anexos que ambas partes puedan acordar. Servicios inicialmente contratados: ${service}.

2. DURACIÓN
El contrato tendrá una duración desde el ${today}, renovable por periodos iguales salvo notificación en contrario con 30 días de antelación.

3. SERVICIOS
Los servicios incluidos serán los acordados por ambas partes y detallados en el anexo correspondiente. El Prestador se compromete a tramitar documentalmente y ejecutar los servicios con la diligencia profesional que corresponde a su actividad.

4. PRECIO Y FORMA DE PAGO
El precio total del contrato asciende a ${value}, pagadero según la frecuencia acordada.

5. CONFIDENCIALIDAD
Ambas partes se comprometen a mantener la confidencialidad de toda la información compartida durante la vigencia del contrato y durante un periodo de 2 años tras su finalización.

6. TRATAMIENTO DE DATOS
El Prestador tratará los datos personales del Cliente únicamente para la prestación de los servicios contratados, de conformidad con el RGPD.

7. TERMINACIÓN
Cualquiera de las partes podrá dar por terminado el contrato con un preaviso de 30 días por escrito.

Firmado en Madrid, a día de ${today}.

_________________________________
Por el Prestador (${company})

_________________________________
Por el Cliente (${opts.businessName})`
}
