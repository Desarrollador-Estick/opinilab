import { sendEmail } from "./send"

// Qué herramientas necesita cada tipo de servicio para poder trabajar.
// Map de category de servicio → lista de herramientas que el cliente debe aportar.
export const REQUIRED_TOOLS_BY_CATEGORY: Record<string, { label: string; toolType: string; items: { name: string; hint: string }[] }> = {
  reviews: {
    label: "Gestión de reseñas",
    toolType: "gbp",
    items: [
      { name: "Google Business Profile (GBP)", hint: "La URL de tu perfil de Google Maps y acceso para responder reseñas." },
    ],
  },
  social_media: {
    label: "Redes sociales",
    toolType: "social_media",
    items: [
      { name: "Acceso a redes", hint: "Usuario y contraseña (o invitación) de Instagram, Facebook, TikTok, etc." },
    ],
  },
  seo: {
    label: "SEO / Google Business Profile",
    toolType: "gbp",
    items: [
      { name: "Google Business Profile (GBP)", hint: "Acceso a tu perfil de Google para optimizarlo." },
      { name: "Google Search Console", hint: "Si lo tienes, el acceso a tu cuenta." },
    ],
  },
  ads: {
    label: "Publicidad",
    toolType: "ads",
    items: [
      { name: "Google Ads", hint: "Acceso a tu cuenta de Google Ads (o invitación como administrador)." },
      { name: "Meta Ads", hint: "Si anuncias en Facebook/Instagram, el acceso a tu Business Manager." },
    ],
  },
  email: {
    label: "Email marketing",
    toolType: "email",
    items: [
      { name: "Plataforma de email", hint: "Acceso a Mailchimp, Brevo, ActiveCampaign, etc., o tus listas de contactos." },
    ],
  },
  branding: {
    label: "Branding",
    toolType: "other",
    items: [
      { name: "Imagen y marca", hint: "Logos, colores de tu marca, tipografías o documentos de identidad." },
    ],
  },
  web: {
    label: "Web",
    toolType: "web",
    items: [
      { name: "Dominio y hosting", hint: "Acceso al panel de tu dominio (GoDaddy, Namecheap...) y al hosting/gestor de la web." },
      { name: "Web actual", hint: "Si tienes web, acceso al CMS (WordPress, WIX...) o el enlace." },
    ],
  },
}

// Envía al cliente un email indicando las herramientas que debe aportar en su
// portal para el servicio recién contratado. Nunca rompe el flujo principal.
export async function sendRequiredToolsEmail(opts: {
  email: string
  fullName?: string
  businessName?: string
  serviceName: string
  category: string
  portalUrl?: string
}) {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  const portalUrl = opts.portalUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/portal/herramientas`
  const req = REQUIRED_TOOLS_BY_CATEGORY[opts.category]

  let toolsHtml = ""
  if (req) {
    toolsHtml = req.items
      .map(
        (item, i) => `
          <tr>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:14px;color:#0f172a;width:40%">${i + 1}. ${item.name}</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:14px;color:#4b5563">${item.hint}</td>
          </tr>`
      )
      .join("")
  }

  return sendEmail({
    to: opts.email,
    template: "required-tools",
    subject: `${company} — accesos necesarios para ${opts.serviceName}`,
    html: `
      <div style="background-color:#f3f4f6;padding:24px 0">
        <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
          <div style="background:#0f172a;padding:28px 32px">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">Necesitamos algunos accesos</h1>
            <p style="color:#94a3b8;margin:8px 0 0;font-size:14px">Para el servicio: ${opts.serviceName}</p>
          </div>
          <div style="padding:32px">
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Hola${opts.fullName ? ` ${opts.fullName}` : ""}${
                opts.businessName ? ` (${opts.businessName})` : ""
              },
            </p>
            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Hemos dado de alta el servicio <strong>${opts.serviceName}</strong>. Para poder comenzar, necesitamos que nos facilites el acceso a las siguientes herramientas:
            </p>

            ${
              toolsHtml
                ? `<table style="border-collapse:collapse;width:100%;margin:0 0 20px">${toolsHtml}</table>`
                : `<p style="margin:0 0 20px;color:#4b5563;line-height:1.6">
                    Nos pondremos en contacto contigo para indicarte exactamente qué información necesitamos.
                  </p>`
            }

            <p style="margin:0 0 16px;line-height:1.6;color:#111827">
              Puedes dejar los accesos de forma segura en tu <strong>portal de cliente</strong>, en la sección <strong>Mis herramientas</strong>. Los datos solo los utiliza nuestro equipo y no se comparten.
            </p>

            <div style="text-align:center;margin:0 0 24px">
              <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                Añadir mis herramientas
              </a>
            </div>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6b7280;text-align:center">
              Si el botón no funciona, copie esta dirección en su navegador:<br>
              <a href="${portalUrl}" style="color:#2563eb">${portalUrl}</a>
            </p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">
            <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4b5563">
              Si no puede aportar alguna de estas herramientas, responde a este correo y te indicaremos alternativas.
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
