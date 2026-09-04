import { createServerAdminClient } from "@/lib/supabase/admin"
import { createClientDriveFolder } from "./drive"
import { createOnboardingContract } from "./contract"
import { sendOnboardingWelcomeEmail } from "./email"

/**
 * Onboarding automático de un cliente cuando se le asigna su PRIMER servicio.
 *
 * Ejecuta de forma síncrona pero NO bloqueante (cada paso es tolerante a fallos)
 * las siguientes tareas:
 *   1. Crear la carpeta de trabajo en Google Drive.
 *   2. Guardar drive_folder_url en el cliente.
 *   3. Generar el contrato de alta (estado draft).
 *   4. Enviar el email de bienvenida (con enlace a Drive y al portal).
 *
 * Cualquier fallo individual solo se loguea y guarda en la tabla `clients` como
 * una nota; jamás rompe la asignación del servicio.
 *
 * Devuelve un resumen con los pasos que se ejecutaron correctamente y los errores.
 */

export type OnboardingResult = {
  driveFolderUrl?: string | null
  steps: Record<string, boolean>
  errors: Record<string, string>
}

export async function runClientOnboarding(opts: {
  clientId: string
}): Promise<OnboardingResult> {
  const result: OnboardingResult = { steps: {}, errors: {} }
  const admin = await createServerAdminClient()

  const { data: client } = await admin
    .from("clients")
    .select("id, business_name, contact_name, email, drive_folder_url, status")
    .eq("id", opts.clientId)
    .maybeSingle()

  if (!client?.email) {
    result.errors.client = "Cliente sin email; onboarding omitido"
    return result
  }

  // Servicio asignado (para el contrato). Tomamos el primero activo del cliente.
  let serviceName: string | undefined
  let setupValue: number | null = null
  const { data: cs } = await admin
    .from("client_services")
    .select("custom_price, services(name, base_price)")
    .eq("client_id", opts.clientId)
    .eq("status", "active")
    .maybeSingle()
  if (cs) {
    const s = Array.isArray(cs.services) ? cs.services[0] : cs.services
    serviceName = s?.name || undefined
    setupValue = cs.custom_price ?? s?.base_price ?? null
  }

  // ---- 1) Carpeta de Drive (idempotente) ----
  if (!client.drive_folder_url) {
    const drive = await createClientDriveFolder({
      businessName: client.business_name,
      clientId: client.id,
    })
    if (drive.ok && drive.url) {
      result.driveFolderUrl = drive.url
      result.steps.drive = true
      try {
        await admin
          .from("clients")
          .update({ drive_folder_url: drive.url })
          .eq("id", client.id)
      } catch (e) {
        console.warn(
          "[onboarding] No se pudo guardar drive_folder_url:",
          e instanceof Error ? e.message : e
        )
      }
    } else {
      result.errors.drive = drive.error || "No se pudo crear la carpeta de Drive"
    }
  } else {
    result.driveFolderUrl = client.drive_folder_url
    result.steps.drive = true
  }

  // ---- 2) Contrato de alta ----
  const contract = await createOnboardingContract({
    clientId: client.id,
    businessName: client.business_name,
    contactName: client.contact_name,
    serviceName,
    value: setupValue,
  })
  if (contract.ok) {
    result.steps.contract = true
  } else {
    result.errors.contract = contract.error || "No se pudo generar el contrato"
  }

  // ---- 3) Email de bienvenida ----
  const mail = await sendOnboardingWelcomeEmail({
    email: client.email,
    businessName: client.business_name,
    contactName: client.contact_name,
    clientId: client.id,
    driveFolderUrl: result.driveFolderUrl,
  })
  if (mail.ok) {
    result.steps.email = true
  } else {
    result.errors.email = "No se pudo enviar el email de bienvenida"
  }

  // Registra el resultado en una nota del cliente (borrador; no sobreescribe notas escritas).
  if (Object.keys(result.errors).length > 0) {
    const summary = Object.entries(result.errors)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")
    console.warn(`[onboarding] Cliente ${client.id} con errores parciales: ${summary}`)
  }

  return result
}
