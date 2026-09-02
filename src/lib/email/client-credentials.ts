import { sendEmail } from "./send"

/**
 * Email de bienvenida y alta de cliente.
 * Se envía automáticamente cuando el sistema crea la cuenta (contraseña temporal)
 * en cualquiera de los tres flujos: alta desde el panel, conversión de lead o
 * creación manual. Indica de forma clara dónde y cómo darse de alta.
 * Nunca rompe el flujo principal (sendEmail ya es tolerante a fallos).
 */
export async function sendClientCredentialsEmail(opts: {
  email: string
  temporaryPassword: string
  fullName?: string
  clientId?: string
}) {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/portal/login`

  return sendEmail({
    to: opts.email,
    template: "client-credentials",
    subject: `Bienvenido a ${company} — tu acceso al portal de cliente`,
    clientId: opts.clientId,
    html: `
      <div style="background-color:#f3f4f6;padding:24px 0">
        <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#0f172a;padding:28px 32px">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">Bienvenido a ${company}</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:14px">Tu cuenta de cliente está lista</p>
          </div>
          <div style="padding:32px">
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Hola${opts.fullName ? ` ${opts.fullName}` : ""},
            </p>
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Nos alegra darle la bienvenida. Hemos creado su cuenta de cliente en
              <strong>${company}</strong>: a partir de ahora podrá consultar su contrato,
              ver y pagar sus facturas, y seguir la evolución de su cuenta.
            </p>

            <h3 style="margin:24px 0 12px;font-size:15px;color:#111827">Cómo darse de alta</h3>
            <ol style="margin:0 0 20px;padding-left:20px;line-height:1.7;color:#111827">
              <li>Entre en el portal de cliente con el botón de abajo.</li>
              <li>Inicie sesión con su email y la contraseña temporal que le facilitamos a continuación.</li>
              <li>En el primer acceso el sistema le pedirá crear una contraseña personal nueva.</li>
            </ol>

            <table style="border-collapse:collapse;width:100%;margin:0 0 20px">
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:40%">Usuario</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;font-size:14px;color:#111827">${opts.email}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;font-size:14px">Contraseña temporal</td>
                <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;font-family:monospace;font-size:14px;color:#111827">${opts.temporaryPassword}</td>
              </tr>
            </table>

            <div style="text-align:center;margin:0 0 24px">
              <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Acceder al portal de cliente
              </a>
            </div>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6b7280;text-align:center">
              Si el botón no funciona, copie esta dirección en su navegador:<br>
              <a href="${portalUrl}" style="color:#2563eb">${portalUrl}</a>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563">
              Por seguridad, esta contraseña es temporal y caducará al cambiarla en su primer acceso.
              Si usted no ha solicitado esta cuenta, puede ignorar este correo.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#4b5563">
              Ante cualquier duda, responda directamente a este correo. Estaremos encantados de ayudarle.
            </p>
            <p style="margin:20px 0 0;font-size:14px;color:#0f172a">
              Un saludo,<br><strong>Equipo de ${company}</strong>
            </p>
          </div>
        </div>
      </div>
    `,
  })
}