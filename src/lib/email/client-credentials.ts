import { sendEmail } from "./send"

/**
 * Envía al cliente sus credenciales de acceso temporales (usuario + contraseña).
 * Se le pide que cambie la contraseña en el primer acceso.
 * Nunca rompe el flujo principal (sendEmail ya es tolerante a fallos).
 */
export async function sendClientCredentialsEmail(opts: {
  email: string
  temporaryPassword: string
  fullName?: string
  clientId?: string
}) {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/portal/login`

  return sendEmail({
    to: opts.email,
    template: "client-credentials",
    subject: "Bienvenido a OpiniLab — tus credenciales de acceso",
    clientId: opts.clientId,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111827">
        <h2 style="margin:0 0 16px">Hola${opts.fullName ? ` ${opts.fullName}` : ""} 👋</h2>
        <p style="line-height:1.6;margin:0 0 16px">
          Te damos la bienvenida al portal de cliente de <strong>OpiniLab</strong>.
          Desde aquí podrás consultar tu contrato, tus facturas (y pagarlas) y la evolución de tu cuenta.
        </p>
        <p style="line-height:1.6;margin:0 0 16px">
          Tus credenciales de acceso (temporales) son:
        </p>
        <table style="border-collapse:collapse;margin:0 0 16px">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280">Usuario</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600">${opts.email}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#6b7280">Contraseña</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;font-family:monospace">${opts.temporaryPassword}</td>
          </tr>
        </table>
        <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Acceder al portal</a>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#4b5563">
          Por seguridad, la primera vez que accedas se te pedirá que cambies esta contraseña por una nueva.
          Si no has solicitado esta cuenta, ignora este correo.
        </p>
      </div>
    `,
  })
}
