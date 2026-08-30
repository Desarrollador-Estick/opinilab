import type { EmailTemplate } from "@/lib/email/templates"

/**
 * Convierte el informe generado por la IA (texto plano simple: líneas con "##",
 * guiones "-", y párrafos) a HTML para insertarlo en el email.
 */
function renderReportBody(markdown: string): string {
  const lines = markdown.split("\n").map((line) => line.trim())
  const html: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      html.push("</ul>")
      inList = false
    }
  }

  for (const line of lines) {
    if (!line) {
      closeList()
      continue
    }
    if (line.startsWith("##")) {
      closeList()
      html.push(`<h3 style="color:#1e40af;margin:20px 0 8px;">${line.replace(/^#+\s*/, "")}</h3>`)
    } else if (line.startsWith("-")) {
      if (!inList) {
        html.push('<ul style="padding-left:18px;line-height:1.7;margin:8px 0;">')
        inList = true
      }
      html.push(`<li>${line.replace(/^-\s*/, "")}</li>`)
    } else {
      closeList()
      html.push(`<p style="margin:8px 0;line-height:1.7;">${line}</p>`)
    }
  }
  closeList()

  return html.join("\n")
}

export function gbpReportEmail(
  contactName: string,
  businessName: string,
  reportContent: string
): EmailTemplate {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  return {
    subject: `📊 Tu informe gratuito de presencia en Google - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📊 Tu informe gratis</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${contactName || "encantados de saludarte"}</strong>,</p>
          <p>Gracias por tu interés en ${company}. Como prometimos, te hemos preparado un <strong>informe con el estado de tu presencia en Google y las mejoras que puedes conseguir</strong> para <strong>${businessName}</strong>.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            ${renderReportBody(reportContent)}
          </div>
          <p>Si quieres que hagamos un análisis más a fondo de tu perfil, responde a este email o pide una llamada gratuita sin compromiso.</p>
          <p>¡Te esperamos!<br><strong>Equipo de ${company}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}
