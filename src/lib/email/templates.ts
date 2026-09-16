export interface EmailTemplate {
  subject: string
  html: string
}

/** Identidad visual OpiniLab — igual que globals.css y la landing. */
const BRAND = {
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",
  accent: "#EA580C",
  accentDark: "#C2410C",
  background: "#F8FAFC",
  foreground: "#1E293B",
  mutedForeground: "#475569",
  border: "#E2E8F0",
  heading: "'Poppins', 'Open Sans', Arial, sans-serif",
  body: "'Open Sans', Arial, sans-serif",
  appUrl: "https://opinilab.com",
}

const company = () => process.env.COMPANY_NAME || "OpiniLab"
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || BRAND.appUrl

/**
 * Shell HTML común a todos los emails: cabecera de marca (logo "O" + nombre +
 * claim), tarjeta blanca con el contenido y pie con enlace a opinilab.com.
 * Replica la identidad visual de la landing.
 */
function brandShell(title: string, content: string, opts: { emoji?: string; tagline?: string } = {}): string {
  const { emoji, tagline } = opts
  const brand = company()
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background:${BRAND.background}; font-family:${BRAND.body}; color:${BRAND.foreground}; -webkit-font-smoothing:antialiased;">
      <div style="max-width:600px; margin:0 auto; padding:20px 12px;">
        <!-- Cabecera de marca -->
        <div style="background:linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight}); padding:26px 24px; border-radius:16px 16px 0 0; text-align:center;">
          <div style="display:inline-flex; align-items:center; gap:10px;">
            <div style="background:${BRAND.primaryDark}; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(37,99,235,0.35);">
              <span style="color:#ffffff; font-weight:700; font-family:${BRAND.heading}; font-size:16px;">O</span>
            </div>
            <span style="color:#ffffff; font-weight:700; font-family:${BRAND.heading}; font-size:20px;">${brand}</span>
          </div>
          <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:13px; line-height:1.5;">Respuestas automáticas a reseñas de Google con IA</p>
        </div>
        <!-- Contenido -->
        <div style="background:#ffffff; border:1px solid ${BRAND.border}; border-top:none; border-radius:0 0 16px 16px; padding:30px 26px;">
          <h1 style="margin:0 0 22px; font-size:22px; font-weight:700; font-family:${BRAND.heading}; color:${BRAND.foreground}; line-height:1.3;">
            ${emoji ? `${emoji} ` : ""}${title}
          </h1>
          ${content}
        </div>
        <!-- Pie -->
        <div style="margin-top:16px; padding:0 8px; text-align:center;">
          <p style="margin:0; font-size:12px; color:#64748b; line-height:1.7;">
            ${tagline || `Automatización de respuestas a reseñas de Google con inteligencia artificial.`}
          </p>
          <p style="margin:4px 0 0; font-size:12px; color:#94a3b8;">
            <a href="${appUrl()}" style="color:${BRAND.primary}; text-decoration:underline;">opinilab.com</a> · <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

/** Botón CTA estándar con la identidad de marca (azul gradiente, como la landing). */
function brandButton(href: string, label: string): string {
  return `
    <div style="text-align:center; margin:28px 0;">
      <a href="${href}" style="display:inline-block; background:linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight}); color:#ffffff; padding:14px 30px; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; font-family:${BRAND.heading}; box-shadow:0 4px 12px rgba(37,99,235,0.3);">${label}</a>
    </div>`
}

/** CTA de reserva de llamada. Si BOOKING_URL está configurado muestra un botón
 *  de calendario; si no, invita a responder el email. */
function bookingCta(): string {
  const url = process.env.BOOKING_URL
  if (url) {
    return `
      <p style="text-align:center; margin:14px 0 0;">
        <a href="${url}" style="display:inline-block; background:${BRAND.accent}; color:white; padding:12px 24px; text-decoration:none; border-radius:10px; font-weight:700; font-size:14px; font-family:${BRAND.heading};">Reservar una llamada de 15 min →</a>
      </p>`
  }
  return `<p style="font-size:12px; color:#9ca3af; text-align:center; margin:12px 0 0;">¿Prefieres una llamada? Simplemente responde a este email y te llamamos nosotros.</p>`
}

export function welcomeEmail(businessName: string, contactName: string): EmailTemplate {
  const c = company()
  return {
    subject: `¡Bienvenido a ${c}! Tus reseñas de Google ya se responden solas`,
    html: brandShell(
      `¡Bienvenido a ${c}!`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${contactName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Bienvenido a ${c}. A partir de ahora, cada reseña que recibas en Google será respondida automáticamente con inteligencia artificial, en menos de 1 hora.</p>

        <h3 style="color:${BRAND.foreground}; margin:0 0 14px; font-size:15px; font-family:${BRAND.heading};">¿Qué ocurre ahora?</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0; vertical-align:top; width:36px; color:${BRAND.primary}; font-weight:bold;">1.</td>
            <td style="padding:8px 0; color:${BRAND.mutedForeground}; line-height:1.8;">Comparte con nosotros el enlace de tu perfil de Google Business Profile (Google Maps) de <strong>${businessName}</strong>.</td>
          </tr>
          <tr>
            <td style="padding:8px 0; vertical-align:top; width:36px; color:${BRAND.primary}; font-weight:bold;">2.</td>
            <td style="padding:8px 0; color:${BRAND.mutedForeground}; line-height:1.8;">La IA empezará a responder automáticamente a cada reseña nueva.</td>
          </tr>
          <tr>
            <td style="padding:8px 0; vertical-align:top; width:36px; color:${BRAND.primary}; font-weight:bold;">3.</td>
            <td style="padding:8px 0; color:${BRAND.mutedForeground}; line-height:1.8;">En 7 días recibirás tu primer informe de evolución de tu reputación.</td>
          </tr>
        </table>

        <div style="background:#eff6ff; border-left:4px solid ${BRAND.primary}; border-radius:10px; padding:16px 18px; margin:24px 0;">
          <p style="margin:0; color:${BRAND.primaryDark}; font-size:13px; line-height:1.8;">💡 <strong>Consejo:</strong> enlaza tu ficha de Google lo antes posible para que la IA pueda empezar a responder tus reseñas.</p>
        </div>

        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 24px;">Si tienes cualquier duda, escríbenos a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a>. Estamos aquí para ayudarte.</p>

        <div style="text-align:center; padding-top:22px; border-top:1px solid ${BRAND.border};">
          <p style="margin:0; color:#6b7280; font-size:13px;">¡Mucho éxito y bienvenido a bordo!</p>
          <p style="margin:6px 0 0; color:${BRAND.foreground}; font-size:14px;"><strong>El equipo de ${c}</strong></p>
        </div>
      `,
      { emoji: "⭐", tagline: "Respuestas automáticas a reseñas de Google en menos de 1 hora, 24/7." }
    ),
  }
}

export function onboardingGuideEmail(
  businessName: string,
  contactName: string
): EmailTemplate {
  const c = company()
  return {
    subject: `Así funciona OpiniLab — Respuestas automáticas a reseñas`,
    html: brandShell(
      `Así funciona tu servicio`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${contactName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te explicamos cómo ${c} gestiona las reseñas de <strong>${businessName}</strong> en Google:</p>
        <ol style="color:${BRAND.mutedForeground}; line-height:1.9; margin:0 0 24px; padding-left:20px;">
          <li><strong>Conectamos tu ficha de Google</strong> — analizamos tus reseñas actuales y la valoración media de tu negocio.</li>
          <li><strong>La IA aprende tu tono</strong> — personalizamos las respuestas según el estilo de tu negocio: profesional, cercano o formal.</li>
          <li><strong>Respuestas automáticas 24/7</strong> — cada reseña nueva recibe una respuesta personalizada en menos de 1 hora.</li>
          <li><strong>Solicitud de reseñas</strong> — enviamos emails a tus clientes pidiéndoles que dejen una reseña en Google.</li>
          <li><strong>Informe mensual</strong> — recibes un informe con el número de reseñas, la evolución de tu valoración y las respuestas enviadas.</li>
        </ol>
        <div style="background:#eff6ff; border-left:4px solid ${BRAND.primary}; border-radius:10px; padding:16px 18px; margin:0 0 22px;">
          <p style="margin:0; color:${BRAND.primaryDark}; font-size:13px; line-height:1.8;"><strong>¿Qué necesitamos de ti?</strong> El enlace de tu perfil de Google Business Profile. Si no lo tienes, ¡nosotros te ayudamos a configurarlo!</p>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Si tienes cualquier duda, escríbenos a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a>.</p>
        <p style="margin:0; color:${BRAND.foreground};">¡Vamos a mejorar tu reputación!<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "📋", tagline: "Todo lo que tu negocio necesita para que cada reseña de Google tenga una respuesta profesional y a tiempo." }
    ),
  }
}

export function invoiceEmail(invoiceNumber: string, total: number, dueDate: string, clientName: string): EmailTemplate {
  const c = company()
  return {
    subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'OpiniLab'}`,
    html: brandShell(
      `Factura`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${clientName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te enviamos la factura <strong>${invoiceNumber}</strong>.</p>
        <div style="background:${BRAND.background}; border:1px solid ${BRAND.border}; border-radius:12px; padding:20px; margin:0 0 22px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Factura:</td>
              <td style="padding:8px 0; text-align:right; font-weight:bold;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Total:</td>
              <td style="padding:8px 0; text-align:right; font-weight:bold; font-size:20px; color:${BRAND.primary};">${total.toFixed(2)}€</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Vencimiento:</td>
              <td style="padding:8px 0; text-align:right;">${dueDate}</td>
            </tr>
          </table>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Por favor, realiza el pago antes de la fecha de vencimiento.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 22px;">Si ya has realizado el pago, puedes ignorar este mensaje.</p>
        <p style="margin:0; color:${BRAND.foreground};">Gracias por tu confianza.<br><strong>${c}</strong></p>
      `,
      { emoji: "📄", tagline: "Facturación clara y transparente. Tu única agencia de reseñas de Google." }
    ),
  }
}

export function invoiceWithLinkEmail(invoiceNumber: string, total: number, dueDate: string, clientName: string, payUrl: string): EmailTemplate {
  const c = company()
  return {
    subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'OpiniLab'}`,
    html: brandShell(
      `Factura`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${clientName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te enviamos la factura <strong>${invoiceNumber}</strong>.</p>
        <div style="background:${BRAND.background}; border:1px solid ${BRAND.border}; border-radius:12px; padding:20px; margin:0 0 22px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Factura:</td>
              <td style="padding:8px 0; text-align:right; font-weight:bold;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Total:</td>
              <td style="padding:8px 0; text-align:right; font-weight:bold; font-size:20px; color:${BRAND.primary};">${total.toFixed(2)}€</td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#6b7280;">Vencimiento:</td>
              <td style="padding:8px 0; text-align:right;">${dueDate}</td>
            </tr>
          </table>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 4px;">Puedes pagar de forma segura desde el enlace de abajo. Al pagar, tu tarjeta quedará guardada para los próximos cobros mensuales.</p>
        ${brandButton(payUrl, "Pagar ahora →")}
        <p style="font-size:12px; color:#9ca3af; text-align:center; margin:-14px 0 22px;">Si el botón no funciona, copia este enlace en tu navegador: <a href="${payUrl}" style="color:${BRAND.primary};">${payUrl}</a></p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Si ya has realizado el pago, puedes ignorar este mensaje.</p>
        <p style="margin:0; color:${BRAND.foreground};">Gracias por tu confianza.<br><strong>${c}</strong></p>
      `,
      { emoji: "📄", tagline: "Pago seguro con Stripe. Facturación clara y transparente." }
    ),
  }
}

export function paymentReminder(invoiceNumber: string, total: number, daysOverdue: number, clientName: string): EmailTemplate {
  const c = company()
  return {
    subject: `Recordatorio: Factura ${invoiceNumber} vencida - ${process.env.COMPANY_NAME || 'OpiniLab'}`,
    html: brandShell(
      `Pago pendiente`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${clientName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te recordamos que la factura <strong>${invoiceNumber}</strong> está pendiente de pago desde hace <strong>${daysOverdue} días</strong>.</p>
        <div style="background:#fef2f2; border:1px solid #fecaca; border-left:4px solid #dc2626; border-radius:12px; padding:18px 20px; margin:0 0 22px;">
          <p style="margin:0; color:#dc2626; font-weight:bold; font-size:16px;">Total pendiente: ${total.toFixed(2)}€</p>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Por favor, realiza el pago lo antes posible para mantener tu servicio de respuesta automática activo.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 22px;">Si ya has realizado el pago, por favor ignora este mensaje.</p>
        <p style="margin:0; color:${BRAND.foreground};">Gracias.<br><strong>${c}</strong></p>
      `,
      { emoji: "⚠️", tagline: "Para que la IA siga respondiendo tus reseñas de Google sin interrupciones." }
    ),
  }
}

export function reviewRequest(customerName: string, businessName: string, reviewUrl: string): EmailTemplate {
  return {
    subject: `¡Tu opinión nos importa! - ${businessName}`,
    html: brandShell(
      `Tu opinión nos ayuda`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${customerName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Esperamos que tu experiencia con <strong>${businessName}</strong> haya sido excelente.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">¿Nos ayudarías a dejarnos una reseña? Tu opinión nos ayuda a mejorar y a que más personas nos descubran.</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="${reviewUrl}" style="display:inline-block; background:${BRAND.accent}; color:white; padding:14px 30px; text-decoration:none; border-radius:10px; font-weight:bold; font-size:16px; font-family:${BRAND.heading};">Dejar una Reseña ⭐</a>
        </p>
        <p style="font-size:12px; color:#9ca3af; text-align:center; margin:-14px 0 22px;">Si el botón no funciona, copia este enlace en tu navegador: <a href="${reviewUrl}" style="color:${BRAND.primary};">${reviewUrl}</a></p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0;">Solo te tomará 1 minuto. ¡Gracias por tu tiempo!</p>
        <p style="margin:14px 0 0;"><strong>${businessName}</strong></p>
      `,
      { emoji: "⭐", tagline: "Cada reseña cuenta para la reputación online de ${businessName} en Google." }
    ),
  }
}

export function reviewRequestAuto(customerName: string, businessName: string, reviewUrl: string | null): EmailTemplate {
  const reviewBlock = reviewUrl
    ? `
        <p style="text-align:center; margin:24px 0;">
          <a href="${reviewUrl}" style="display:inline-block; background:${BRAND.accent}; color:white; padding:14px 30px; text-decoration:none; border-radius:10px; font-weight:bold; font-size:16px; font-family:${BRAND.heading};">Dejar una Reseña ⭐</a>
        </p>
        <p style="font-size:12px; color:#9ca3af; text-align:center; margin:-14px 0 22px;">Si el botón no funciona, copia este enlace en tu navegador: <a href="${reviewUrl}" style="color:${BRAND.primary};">${reviewUrl}</a></p>`
    : `<p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Puedes dejar tu valoración directamente en nuestro perfil de Google o respondiendo a este email.</p>`

  return {
    subject: `¿Cómo podemos mejorar? Tu opinión nos ayuda - ${businessName}`,
    html: brandShell(
      `¿Cómo podemos mejorar?`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${customerName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Esperamos que tu experiencia con <strong>${businessName}</strong> haya sido excelente.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">¿Nos ayudarías dejándonos una reseña? Tu opinión nos ayuda a mejorar y a que más personas nos descubran.</p>
        ${reviewBlock}
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0;">Solo te tomará 1 minuto. ¡Gracias por tu tiempo!</p>
        <p style="margin:14px 0 0;"><strong>${businessName}</strong></p>
      `,
      { emoji: "⭐", tagline: "Cada opinión ayuda a ${businessName} a mejorar y ser más visible en Google." }
    ),
  }
}

export function adminReviewDraft(businessName: string, reviewerName: string, draft: string): EmailTemplate {
  const c = company()
  return {
    subject: `🤖 Respuesta automática a reseña - ${businessName}`,
    html: brandShell(
      `Respuesta automática generada`,
      `
        <p style="color:${BRAND.foreground}; line-height:1.8; margin:0 0 18px;">La IA ha respondido automáticamente a una reseña de <strong>${reviewerName}</strong> en <strong>${businessName}</strong>. La respuesta ya está guardada en el panel de reseñas.</p>
        <div style="background:${BRAND.background}; border:1px dashed ${BRAND.primary}; border-radius:12px; padding:20px; margin:0 0 20px; color:#4b5563; line-height:1.8;">
          "${draft}"
        </div>
        <div style="background:#fffbeb; border-left:4px solid ${BRAND.accent}; border-radius:10px; padding:16px 18px; margin:0 0 20px;">
          <p style="margin:0; color:${BRAND.accentDark}; font-size:13px; line-height:1.8;"><strong>Importante:</strong> la respuesta está registrada y guardada, pero debe publicarse en la ficha de Google. Revísala en el panel de reseñas y publícala en Google Maps si estás conforme.</p>
        </div>
        <p style="margin:0; color:${BRAND.mutedForeground}; line-height:1.8;">¡Gracias!<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "🤖", tagline: "Gestión de reseñas de Google con IA para ${businessName}." }
    ),
  }
}

export function salesAgentAdminNotify(businessName: string, fromEmail: string, intent: string, quote: string): EmailTemplate {
  const c = company()
  return {
    subject: `🤖 Agente IA: ${intent} — ${businessName}`,
    html: brandShell(
      `El agente de ventas IA necesita tu visto bueno`,
      `
        <h3 style="color:${BRAND.foreground}; margin:0 0 8px; font-family:${BRAND.heading};">${businessName}</h3>
        <p style="color:#6b7280; margin:0 0 18px;">${fromEmail} · Intención: <strong>${intent}</strong></p>
        <div style="background:${BRAND.background}; border:1px dashed ${BRAND.primary}; border-radius:12px; padding:16px; margin:0 0 18px; color:#4b5563; font-size:14px; line-height:1.7;">
          "${quote}"
        </div>
        <p style="line-height:1.7; margin:0 0 18px; color:${BRAND.mutedForeground};">Revisa este lead en <strong>/dashboard/leads</strong>. Si es un <strong>sí</strong>, convierte el lead en cliente para enviar contrato y factura (eso sí requiere tu acción). El agente NO cierra contratos solo.</p>
        <p style="margin:0; color:#6b7280; font-size:13px;">— Equipo de ${c}</p>
      `,
      { emoji: "🤝", tagline: "Cada lead cualificado de ${businessName} llega a tu panel para convertirlo." }
    ),
  }
}

// CTA de contratación directa (pago por lead): enlace público seguro a /pagar/lead/:id
export function paymentCtaButton(leadId: string): string {
  const href = `${appUrl()}/pagar/lead/${leadId}`
  return `
      <div style="text-align:center; margin:26px 0 6px;">
        <a href="${href}" style="display:inline-block; background:linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight}); color:white; padding:15px 32px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; font-family:${BRAND.heading}; box-shadow:0 4px 14px rgba(37,99,235,0.35);">
          Darme de alta · 79€ primer mes →
        </a>
        <p style="font-size:12px; color:#9ca3af; margin-top:10px;">49€/mes + 30€ alta · Pago seguro con Stripe · Sin permanencia</p>
      </div>
    `
}

// Añade el botón de contratación de forma independiente del template usado, para
// que TODOS los correos de oferta incluyan el enlace de pago por lead.
export function appendPaymentCta(html: string, leadId: string): string {
  const cta = paymentCtaButton(leadId)
  if (!html) return cta
  // Si la plantilla BD ya contiene un CTA de pago por lead, no duplicar.
  if (html.includes("/pagar/lead/")) return html
  if (html.includes("</body>")) {
    return html.replace("</body>", `${cta}</body>`)
  }
  return html + cta
}

export function followUpEmail(leadName: string, businessName: string): EmailTemplate {
  const c = company()
  return {
    subject: `¿Tus reseñas de Google se responden solas? - ${process.env.COMPANY_NAME || 'OpiniLab'}`,
    html: brandShell(
      `Tus reseñas de Google, respondidas`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${leadName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Hace unos días nos pusimos en contacto con <strong>${businessName}</strong> sobre cómo podemos mejorar vuestra reputación en Google.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 12px;">¿Te gustaría que te mostráramos cómo podemos:</p>
        <ul style="color:${BRAND.mutedForeground}; line-height:1.9; margin:0 0 20px; padding-left:20px;">
          <li>✅ Responder automáticamente a cada reseña de Google</li>
          <li>✅ Mejorar tu valoración media en menos de 30 días</li>
          <li>✅ Conseguir más reseñas de forma automática</li>
        </ul>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Ofrecemos un <strong>análisis gratuito sin compromiso</strong> de tus reseñas actuales.</p>
        ${brandButton("mailto:info@opinilab.com?subject=Quiero%20mi%20an%C3%A1lisis%20gratuito", "Sí, quiero mi análisis gratuito →")}
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0;">¡Esperamos poder mejorar tu reputación!</p>
        <p style="margin:14px 0 0;"><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "👋", tagline: "Cada reseña de Google respondida a tiempo mejora tu reputación y tu visibilidad." }
    ),
  }
}

export function coldLeadEmail(name: string, businessName: string): EmailTemplate {
  const c = company()
  return {
    subject: `Reseñas de Google: OpiniLab responde por ti (${businessName})`,
    html: brandShell(
      `Responde a cada reseña de Google`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${name}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Hemos visto <strong>${businessName}</strong> en Google y creemos que puedes atraer más clientes si cuidas tu reputación en las reseñas.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 12px;">En ${c} nos encargamos de que cada reseña de tu ficha de Google tenga una respuesta profesional y personalizada:</p>
        <ul style="color:${BRAND.mutedForeground}; line-height:1.9; margin:0 0 20px; padding-left:20px;">
          <li>✅ Respuesta automática a reseñas positivas y negativas con IA</li>
          <li>✅ Personalización del tono según tu negocio</li>
          <li>✅ Solicitud automática de nuevas reseñas a tus clientes</li>
        </ul>
        <div style="background:#eff6ff; border-left:4px solid ${BRAND.primary}; border-radius:10px; padding:14px 18px; margin:0 0 20px;">
          <p style="margin:0; color:${BRAND.primaryDark}; font-size:14px; line-height:1.7;"><strong>49€/mes</strong> + 30€ de alta (solo el primer mes). Sin permanencia, cancelas cuando quieras.</p>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te enviamos un <strong>análisis gratuito de tus reseñas en Google</strong> sin compromiso:</p>
        ${brandButton("mailto:info@opinilab.com?subject=Quiero%20mi%20an%C3%A1lisis%20gratuito%20de%20rese%C3%B1as%20para%20" + encodeURIComponent(businessName), "Quiero mi análisis gratuito →")}
        <p style="font-size:12px; color:#9ca3af; text-align:center; margin:-14px 0 18px;">También puedes simplemente responder a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary};">info@opinilab.com</a>.</p>
        ${bookingCta()}
        <p style="margin:16px 0 0; color:${BRAND.mutedForeground};">Un saludo,<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "🚀", tagline: "Ayudamos a negocios como ${businessName} a responder cada reseña de Google con IA." }
    ),
  }
}

export function finalFollowUpEmail(name: string, businessName: string): EmailTemplate {
  const c = company()
  return {
    subject: `Último aviso: respuesta automática a reseñas por 49€/mes + 30€ alta`,
    html: brandShell(
      `Último aviso`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${name}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Esta es nuestra última comunicación sobre <strong>${businessName}</strong>.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">La oferta de lanzamiento para los primeros negocios de tu zona es <strong>49€/mes + 30€ de alta</strong> (solo el primer mes).</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Si todavía te interesa ver tu análisis gratuito, responde a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary};">info@opinilab.com</a>.</p>
        ${brandButton("mailto:info@opinilab.com?subject=S%C3%AD%2C%20quiero%20mi%20an%C3%A1lisis%20gratuito", "Sí, quiero mi análisis gratuito →")}
        <p style="font-size:12px; color:#9ca3af; text-align:center; margin:-14px 0 18px;">Si ya no te interesa, responde con "no interesado" a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary};">info@opinilab.com</a> y no volveremos a escribirte.</p>
        ${bookingCta()}
        <p style="margin:16px 0 0; color:${BRAND.mutedForeground};">Un saludo,<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "⏳", tagline: "Última oportunidad para que ${businessName} responda cada reseña de Google con IA." }
    ),
  }
}

export function promotionEmail(name: string, businessName: string): EmailTemplate {
  const c = company()
  return {
    subject: `${c}: Responde a tus reseñas de Google automáticamente`,
    html: brandShell(
      `Tus reseñas de Google, en piloto automático`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${name}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Hemos visto a <strong>${businessName}</strong> en Google y creemos que ${c} puede ayudarte a mejorar tu reputación con respuestas automáticas a reseñas.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 12px;">Podemos ayudarte a:</p>
        <ul style="color:${BRAND.mutedForeground}; line-height:1.9; margin:0 0 20px; padding-left:20px;">
          <li>✅ Responder a cada reseña de Google con IA en menos de 1 hora</li>
          <li>✅ Conseguir más reseñas de forma automática</li>
          <li>✅ Mejorar tu valoración media en Google</li>
        </ul>
        <div style="background:#eff6ff; border-left:4px solid ${BRAND.primary}; border-radius:10px; padding:14px 18px; margin:0 0 22px;">
          <p style="margin:0; color:${BRAND.primaryDark}; font-size:14px; line-height:1.7;"><strong>49€/mes</strong> + 30€ de alta (solo el primer mes). Sin permanencia.</p>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Te ofrecemos un <strong>análisis gratuito y sin compromiso</strong> de tus reseñas actuales. Escríbenos a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a> y te contamos cómo podemos empezar.</p>
        <p style="margin:0; color:${BRAND.mutedForeground};">Un saludo,<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "🚀", tagline: "Para que ${businessName} nunca más deje una reseña de Google sin responder." }
    ),
  }
}

export type EmailTemplateKey = "welcome" | "onboardingGuide" | "invoice" | "paymentReminder" | "reviewRequest" | "followUp" | "report"

export function paymentThanksEmail(businessName: string, contactName: string, invoiceNumber: string, total: number): EmailTemplate {
  const c = company()
  return {
    subject: `✅ Pago recibido - Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'OpiniLab'}`,
    html: brandShell(
      `¡Pago recibido!`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${contactName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Hemos recibido correctamente el pago de <strong>${total.toFixed(2)}€</strong> correspondiente a la factura <strong>${invoiceNumber}</strong> de <strong>${businessName}</strong>.</p>
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-left:4px solid #059669; border-radius:10px; padding:14px 18px; margin:0 0 20px;">
          <p style="margin:0; color:#065f46; font-size:14px; line-height:1.7;">Gracias por tu confianza. La IA ya está (o estará muy pronto) respondiendo a tus reseñas de Google.</p>
        </div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Si tienes cualquier duda, no dudes en escribirnos a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a>.</p>
        <p style="margin:0; color:${BRAND.foreground};">¡Gracias!<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "🎉", tagline: "Pago procesado de forma segura con Stripe." }
    ),
  }
}

export function projectReadyEmail(contactName: string, businessName: string, serviceName: string, remainingTotal: number, invoiceNumber: string, payUrl: string): EmailTemplate {
  const c = company()
  return {
    subject: `🎉 ${serviceName} listo para entregar - ${businessName}`,
    html: brandShell(
      `¡Tu proyecto está acabado!`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${contactName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Buenas noticias: hemos terminado <strong>${serviceName}</strong> para <strong>${businessName}</strong> y ya está listo para entregarte.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 20px;">Para recibirlo, solo falta abonar la factura restante de <strong>${remainingTotal.toFixed(2)}€</strong> (factura <strong>${invoiceNumber}</strong>).</p>
        ${brandButton(payUrl, "Abonar y recibir mi proyecto →")}
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">En cuanto confirmemos el pago, te lo entregamos de inmediato.</p>
        <p style="margin:0; color:${BRAND.foreground};">¡Gracias por tu confianza!<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "🎉", tagline: "Tu servicio de reseñas de Google, listo para empezar." }
    ),
  }
}

export const emailTemplates: Record<EmailTemplateKey, (data: Record<string, string | number>) => EmailTemplate> = {
  welcome: (data) => welcomeEmail(data.businessName as string, data.contactName as string),
  onboardingGuide: (data) => onboardingGuideEmail(data.businessName as string, data.contactName as string),
  invoice: (data) => invoiceEmail(data.invoiceNumber as string, data.total as number, data.dueDate as string, data.clientName as string),
  paymentReminder: (data) => paymentReminder(data.invoiceNumber as string, data.total as number, data.daysOverdue as number, data.clientName as string),
  reviewRequest: (data) => reviewRequest(data.customerName as string, data.businessName as string, data.reviewUrl as string),
  followUp: (data) => followUpEmail(data.leadName as string, data.businessName as string),
  report: (data) => reportNotification(data.clientName as string, data.businessName as string, data.period as string),
}

export function privacyRequestNotify(
  fullName: string | null,
  email: string,
  requestType: string,
  details: string
): EmailTemplate {
  const c = company()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || BRAND.appUrl
  const labels: Record<string, string> = {
    acceso: "Acceso",
    rectificacion: "Rectificación",
    supresion: "Supresión / derecho al olvido",
    limitacion: "Limitación del tratamiento",
    portabilidad: "Portabilidad",
    oposicion: "Oposición",
    baja_marketing: "Baja de comunicaciones comerciales",
  }
  return {
    subject: `🛡️ Solicitud de derechos RGPD — ${requestType}`,
    html: brandShell(
      `Nueva solicitud de protección de datos`,
      `
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Se ha recibido una solicitud de ejercicio de derechos RGPD en la web:</p>
        <div style="background:${BRAND.background}; border:1px solid ${BRAND.border}; border-radius:12px; padding:18px 20px; margin:0 0 18px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px 0; color:#6b7280;">Nombre:</td><td style="text-align:right; font-weight:bold;">${fullName || "No indicado"}</td></tr>
            <tr><td style="padding:8px 0; color:#6b7280;">Email:</td><td style="text-align:right; font-weight:bold;">${email}</td></tr>
            <tr><td style="padding:8px 0; color:#6b7280;">Derecho solicitado:</td><td style="text-align:right; font-weight:bold;">${labels[requestType] || requestType}</td></tr>
          </table>
        </div>
        <div style="background:${BRAND.background}; border:1px dashed #94a3b8; border-radius:12px; padding:16px; margin:0 0 18px; color:#4b5563; font-size:14px; white-space:pre-wrap;">${details.replace(/</g, "&lt;")}</div>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0;">Gestiona la solicitud desde el panel: <a href="${baseUrl}/dashboard/proteccion-datos" style="color:${BRAND.primary};">/dashboard/proteccion-datos</a>. Los derechos de supresión y oposición borran los datos asociados al email de inmediato al resolverlos.</p>
        <p style="margin:16px 0 0; color:#6b7280; font-size:13px;">— Equipo de ${c}</p>
      `,
      { emoji: "🛡️", tagline: "Protección de datos y derechos RGPD, gestionados desde tu panel." }
    ),
  }
}

export function reportNotification(clientName: string, businessName: string, period: string): EmailTemplate {
  const c = company()
  return {
    subject: `📊 Tu informe de reseñas de Google - ${period}`,
    html: brandShell(
      `Informe disponible`,
      `
        <p style="color:${BRAND.foreground}; font-size:16px; margin:0 0 18px;">Hola <strong>${clientName}</strong>,</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;">Tu informe de reseñas de Google de <strong>${businessName}</strong> para <strong>${period}</strong> ya está disponible.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 16px;"><strong>Incluye:</strong> reseñas recibidas, respuestas generadas y evolución de tu valoración en Google.</p>
        <p style="color:${BRAND.mutedForeground}; line-height:1.8; margin:0 0 18px;">Si tienes alguna pregunta sobre el informe, no dudes en escribirnos a <a href="mailto:info@opinilab.com" style="color:${BRAND.primary}; text-decoration:underline;">info@opinilab.com</a>.</p>
        <p style="margin:0; color:${BRAND.foreground};">¡Seguimos mejorando tu reputación en Google!<br><strong>Equipo de ${c}</strong></p>
      `,
      { emoji: "📊", tagline: "La evolución de tu reputación en Google, mes a mes." }
    ),
  }
}