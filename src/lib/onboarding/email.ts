import { sendEmail } from "@/lib/email/send"

/**
 * Email de bienvenida del onboarding: se envía al cliente cuando se le asigna su
 * primer servicio. Incluye la carpeta de Drive creada para su cuenta y el acceso
 * al portal de cliente. Tolerante a fallos (sendEmail nunca lanza).
 */

export async function sendOnboardingWelcomeEmail(opts: {
  email: string
  businessName: string
  contactName?: string | null
  clientId: string
  driveFolderUrl?: string | null
}) {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/portal/login`

  const driveBlock = opts.driveFolderUrl
    ? `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:0 0 20px">
          <p style="margin:0 0 12px;color:#0c4a6e;line-height:1.6">Hemos creado <strong>tu carpeta de trabajo</strong> en Google Drive, donde compartiremos contratos, informes y documentación de <strong>${opts.businessName}</strong>.</p>
          <div style="text-align:center">
            <a href="${opts.driveFolderUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
              Abrir mi carpeta de trabajo
            </a>
          </div>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#0c4a6e;text-align:center">
            Si el enlace no funciona, copia esta dirección en tu navegador:<br>
            <a href="${opts.driveFolderUrl}" style="color:#2563eb">${opts.driveFolderUrl}</a>
          </p>
        </div>
      `
    : `
        <p style="margin:0 0 16px;line-height:1.6;color:#4b5563">
          En breve te facilitaremos el enlace a tu carpeta de trabajo compartida.
        </p>
      `

  return sendEmail({
    to: opts.email,
    template: "onboarding-welcome",
    subject: `¡Bienvenido a ${company} — tu nuevo proyecto está en marcha!`,
    clientId: opts.clientId,
    html: `
      <div style="background-color:#f3f4f6;padding:24px 0">
        <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 32px">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">🚀 ¡Bienvenido a ${company}!</h1>
            <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px">Tu proyecto ya está en marcha</p>
          </div>
          <div style="padding:32px">
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Hola${opts.contactName ? ` ${opts.contactName}` : ""},
            </p>
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Nos alegra confirmarte que <strong>${opts.businessName}</strong> ya forma parte de
              <strong>${company}</strong>. Nuestro equipo dará comienzo a los trabajos en las próximas 24 horas.
            </p>

            ${driveBlock}

            <h3 style="margin:24px 0 12px;font-size:15px;color:#111827">Qué puedes esperar</h3>
            <ul style="margin:0 0 20px;padding-left:20px;line-height:1.7;color:#111827">
              <li><strong>Contrato:</strong> en los próximos días te compartiremos el documento para su firma.</li>
              <li><strong>Facturas:</strong> podrás consultarlas y pagarlas desde tu portal de cliente.</li>
              <li><strong>Informes:</strong> recibirás informes periódicos con los resultados obtenidos.</li>
            </ul>

            <div style="text-align:center;margin:0 0 24px">
              <a href="${portalUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Acceder al portal de cliente
              </a>
            </div>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6b7280;text-align:center">
              Si el botón no funciona, copie esta dirección en su navegador:<br>
              <a href="${portalUrl}" style="color:#2563eb">${portalUrl}</a>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563">
              Si tiene cualquier duda, responda directamente a este correo. Estaremos encantados de ayudarle.
            </p>
            <p style="margin:0;font-size:14px;color:#0f172a">
              Un saludo,<br><strong>Equipo de ${company}</strong>
            </p>
          </div>
        </div>
      </div>
    `,
  })
}
