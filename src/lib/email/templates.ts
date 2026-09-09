export interface EmailTemplate {
  subject: string
  html: string
}

export function welcomeEmail(businessName: string, contactName: string): EmailTemplate {
  const company = process.env.COMPANY_NAME || "OpiniLab"
  return {
    subject: `¡Bienvenido a ${company}! Tu presencia online empieza ahora`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f5f7;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 36px 30px; border-radius: 14px 14px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: -0.5px;">⭐ OpiniLab</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0; font-size: 15px;">Tu presencia online, gestionada por expertos</p>
        </div>
        <div style="background: #ffffff; padding: 32px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 14px 14px;">
          <p style="color: #111827; font-size: 16px;">Hola <strong>${contactName}</strong>,</p>
          <p style="color: #374151; line-height: 1.7;">Gracias por confiar en OpiniLab para hacer crecer <strong>${businessName}</strong>. Ya has dado el primer paso para que más clientes encuentren tu negocio.</p>

          <h3 style="color: #111827; margin: 24px 0 14px; font-size: 15px;">¿Qué ocurre ahora?</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 36px; color: #2563eb; font-weight: bold;">1.</td>
              <td style="padding: 10px 0; color: #374151; line-height: 1.6;">Auditamos tu ficha de Google y tu presencia online actual.</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 36px; color: #2563eb; font-weight: bold;">2.</td>
              <td style="padding: 10px 0; color: #374151; line-height: 1.6;">Activamos tu estrategia de reseñas, visibilidad y captación de clientes.</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top; width: 36px; color: #2563eb; font-weight: bold;">3.</td>
              <td style="padding: 10px 0; color: #374151; line-height: 1.6;">Recibes tu primer informe de resultados en los próximos 7 días.</td>
            </tr>
          </table>

          <div style="background: #eef2ff; border-radius: 10px; padding: 16px 18px; margin: 24px 0;">
            <p style="margin: 0; color: #3730a3; font-size: 13px; line-height: 1.6;">💡 <strong>Consejo:</strong> comparte con nosotros el enlace de tu perfil de Google (Google Maps) para que nuestro equipo empiece a trabajar cuanto antes.</p>
          </div>

          <p style="color: #374151; line-height: 1.7;">Si tienes cualquier duda, basta con responder a este email. Estamos aquí para ayudarte.</p>

          <div style="text-align: center; margin: 28px 0 12px; padding-top: 24px; border-top: 1px solid #eef2f7;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">¡Mucho éxito y bienvenido a bordo!</p>
            <p style="margin: 6px 0 0; color: #111827; font-size: 14px;"><strong>El equipo de ${company}</strong></p>
            <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">www.opinilab.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

export function onboardingGuideEmail(
  businessName: string,
  contactName: string
): EmailTemplate {
  const company = process.env.COMPANY_NAME || "Agencia Marketing"
  return {
    subject: `Así trabajamos juntos - ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📋 Así trabajamos juntos</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${contactName}</strong>,</p>
          <p>Te explicamos con detalle cómo vamos a hacer crecer <strong>${businessName}</strong> con ${company}:</p>
          <h3 style="margin-top: 24px;">Nuestro proceso:</h3>
          <ol style="line-height: 1.8;">
            <li><strong>Análisis inicial gratuito</strong> — revisamos tu presencia online, tus reseñas en Google y tu posicionamiento actual.</li>
            <li><strong>Plan personalizado</strong> — te proponemos los servicios que mejor se adaptan a tu negocio y a tu presupuesto.</li>
            <li><strong>Nos ponemos en marcha</strong> — activamos tu estrategia y empezamos a conseguir resultados.</li>
            <li><strong>Seguimiento mensual</strong> — te enviamos un informe con todo lo que hemos hecho y los resultados obtenidos.</li>
          </ol>
          <h3 style="margin-top: 24px;">¿Qué necesitamos de ti?</h3>
          <p>Para empezar, será muy útil que nos facilites el enlace de tu perfil de Google Business Profile (Google Maps). Si no lo tienes, ¡nosotros te ayudamos a crearlo!</p>
          <p>Si tienes cualquier duda, responde directamente a este email.</p>
          <p>¡Vamos a por ello!<br><strong>Equipo de ${company}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function invoiceEmail(invoiceNumber: string, total: number, dueDate: string, clientName: string): EmailTemplate {
  return {
    subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'Agencia Marketing'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📄 Factura</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Te enviamos la factura <strong>${invoiceNumber}</strong>.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Factura:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Total:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 20px; color: #2563eb;">${total.toFixed(2)}€</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Vencimiento:</td>
                <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
              </tr>
            </table>
          </div>
          <p>Por favor, realiza el pago antes de la fecha de vencimiento.</p>
          <p>Si ya has realizado el pago, puedes ignorar este mensaje.</p>
          <p>Gracias por tu confianza.<br><strong>${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function invoiceWithLinkEmail(invoiceNumber: string, total: number, dueDate: string, clientName: string, payUrl: string): EmailTemplate {
  return {
    subject: `Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'Agencia Marketing'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📄 Factura</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Te enviamos la factura <strong>${invoiceNumber}</strong>.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Factura:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Total:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 20px; color: #2563eb;">${total.toFixed(2)}€</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Vencimiento:</td>
                <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
              </tr>
            </table>
          </div>
          <p>Puedes pagar de forma segura desde el enlace de abajo. Al pagar, tu tarjeta quedará guardada para los próximos cobros mensuales.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Pagar ahora
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">Si el botón no funciona, copia este enlace en tu navegador: <a href="${payUrl}" style="color: #2563eb;">${payUrl}</a></p>
          <p>Si ya has realizado el pago, puedes ignorar este mensaje.</p>
          <p>Gracias por tu confianza.<br><strong>${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function paymentReminder(invoiceNumber: string, total: number, daysOverdue: number, clientName: string): EmailTemplate {
  return {
    subject: `Recordatorio: Factura ${invoiceNumber} vencida - ${process.env.COMPANY_NAME || 'Agencia Marketing'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc2626; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ Pago Pendiente</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Te recordamos que la factura <strong>${invoiceNumber}</strong> está pendiente de pago desde hace <strong>${daysOverdue} días</strong>.</p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626; font-weight: bold;">Total pendiente: ${total.toFixed(2)}€</p>
          </div>
          <p>Por favor, realiza el pago lo antes posible.</p>
          <p>Si ya has realizado el pago, por favor ignora este mensaje.</p>
          <p>Gracias.<br><strong>${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function reviewRequest(customerName: string, businessName: string, reviewUrl: string): EmailTemplate {
  return {
    subject: `¡Tu opinión nos importa! - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">⭐ ¡Valoranos!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${customerName}</strong>,</p>
          <p>Esperamos que tu experiencia con <strong>${businessName}</strong> haya sido excelente.</p>
          <p>¿Nos ayudarías a dejarnos una reseña? Tu opinión nos ayuda a mejorar y a que más personas nos descubran.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Dejar una Reseña ⭐
            </a>
          </div>
          <p>Solo te tomará 1 minuto. ¡Gracias por tu tiempo!</p>
          <p><strong>${businessName}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function reviewRequestAuto(customerName: string, businessName: string, reviewUrl: string | null): EmailTemplate {
  const reviewBlock = reviewUrl
    ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Dejar una Reseña ⭐
          </a>
        </div>
        <p style="font-size: 12px; color: #9ca3af;">Si el botón no funciona, copia este enlace en tu navegador: <a href="${reviewUrl}" style="color: #2563eb;">${reviewUrl}</a></p>`
    : `<p>Puedes dejar tu valoración directamente en nuestro perfil de Google o respondiendo a este email.</p>`

  return {
    subject: `¿Cómo podemos mejorar? Tu opinión nos ayuda - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">⭐ ¡Valoranos!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${customerName}</strong>,</p>
          <p>Esperamos que tu experiencia con <strong>${businessName}</strong> haya sido excelente.</p>
          <p>¿Nos ayudarías dejándonos una reseña? Tu opinión nos ayuda a mejorar y a que más personas nos descubran.</p>
          ${reviewBlock}
          <p>Solo te tomará 1 minuto. ¡Gracias por tu tiempo!</p>
          <p><strong>${businessName}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function adminReviewDraft(businessName: string, reviewerName: string, draft: string): EmailTemplate {
  return {
    subject: `✍️ Borrador de respuesta a reseña listo - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c3aed; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">✍️ Borrador de respuesta</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>La IA ha preparado un borrador de respuesta para una reseña de <strong>${reviewerName}</strong> en <strong>${businessName}</strong>.</p>
          <div style="background: white; border: 1px dashed #c4b5fd; border-radius: 8px; padding: 20px; margin: 20px 0; color: #4b5563;">
            "${draft}"
          </div>
          <p style="color: #b45309;"><strong>Importante:</strong> el borrador NO se ha publicado. Revísalo, edítalo si lo necesitas y publícalo desde el panel de reseñas.</p>
          <p>¡Gracias!<br><strong>Equipo de ${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function followUpEmail(leadName: string, businessName: string): EmailTemplate {
  return {
    subject: `¿Podemos ayudarte con tu marketing? - ${process.env.COMPANY_NAME || 'Agencia Marketing'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">👋 ¡Hola!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${leadName}</strong>,</p>
          <p>Hace unos días nos pusimos en contacto con <strong>${businessName}</strong> sobre cómo podemos ayudaros con vuestra estrategia de marketing digital.</p>
          <p>¿Te gustaría que te mostráramos cómo podemos:</p>
          <ul>
            <li>✅ Aumentar tus reseñas en Google</li>
            <li>✅ Mejorar tu posicionamiento en buscadores</li>
            <li>✅ Atraer más clientes a través de redes sociales</li>
          </ul>
          <p>Ofrecemos una <strong>consulta gratuita</strong> sin compromiso.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${process.env.EMAIL_FROM || 'hola@opinilab.com'}?subject=Consulta%20gratuita" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Responder a este email
            </a>
          </div>
          <p>¡Esperamos poder trabajar juntos!</p>
          <p><strong>Equipo de ${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function coldLeadEmail(name: string, businessName: string): EmailTemplate {
  const company = process.env.COMPANY_NAME || "Agencia Marketing"
  return {
    subject: `Reseñas y visibilidad para ${businessName} (oferta 49€/mes)`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🚀 ${company}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${name}</strong>,</p>
          <p>Hemos visto <strong>${businessName}</strong> en Google y en redes sociales, y creemos que puedes atraer más clientes de tu zona de una forma sencilla.</p>
          <p>En ${company} nos encargamos de que tu ficha de Google y tus reseñas trabajen por ti:</p>
          <ul>
            <li>✅ Conseguir reseñas nuevas de forma continuada</li>
            <li>✅ Responderlas y cuidar tu reputación online</li>
            <li>✅ Mejorar tu presencia para que te encuentren más vecinos</li>
          </ul>
          <p>Para tu zona, solo durante el lanzamiento: <strong>49€/mes</strong> sin cuota de alta.</p>
          <p>Te enviamos un <strong>análisis gratuito de tu ficha de Google</strong> sin compromiso:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${process.env.EMAIL_FROM || 'hola@opinilab.com'}?subject=Quiero%20mi%20an%C3%A1lisis%20gratuito%20para%20${encodeURIComponent(businessName)}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Quiero mi análisis gratuito →
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">También puedes simplemente responder a este email.</p>
          <p>Un saludo,<br><strong>Equipo de ${company}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function finalFollowUpEmail(name: string, businessName: string): EmailTemplate {
  const company = process.env.COMPANY_NAME || "Agencia Marketing"
  return {
    subject: `Último aviso: 49€/mes para ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">⏳ Último aviso</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${name}</strong>,</p>
          <p>Esta es nuestra última comunicación sobre <strong>${businessName}</strong>.</p>
          <p>La oferta de lanzamiento para los primeros negocios de tu zona es <strong>49€/mes</strong> y sin cuota de gestión de datos.</p>
          <p>Si todavía te interesa ver tu análisis gratuito, responde a este email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${process.env.EMAIL_FROM || 'hola@opinilab.com'}?subject=S%C3%AD%2C%20quiero%20mi%20an%C3%A1lisis%20gratuito" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Sí, quiero mi análisis gratuito →
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">Si ya no te interesa, responde con "no interesado" y no volveremos a escribirte.</p>
          <p>Un saludo,<br><strong>Equipo de ${company}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function promotionEmail(name: string, businessName: string): EmailTemplate {
  const company = process.env.COMPANY_NAME || "Agencia Marketing"
  return {
    subject: `Haz crecer ${businessName} con ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🚀 ${company}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${name}</strong>,</p>
          <p>Hemos visto a <strong>${businessName}</strong> y creemos que ${company} puede ayudarte a conseguir más clientes.</p>
          <p>Podemos ayudarte a:</p>
          <ul>
            <li>✅ Aumentar tus reseñas en Google</li>
            <li>✅ Mejorar tu posicionamiento en buscadores</li>
            <li>✅ Atraer más clientes a través de redes sociales</li>
          </ul>
          <p>Te ofrecemos una <strong>consulta gratuita y sin compromiso</strong> para analizar tu presencia online.</p>
          <p>Responde a este email y te contamos cómo podemos empezar.</p>
          <p>Un saludo,<br><strong>Equipo de ${company}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export type EmailTemplateKey = "welcome" | "onboardingGuide" | "invoice" | "paymentReminder" | "reviewRequest" | "followUp" | "report"

export function paymentThanksEmail(businessName: string, contactName: string, invoiceNumber: string, total: number): EmailTemplate {
  return {
    subject: `✅ Pago recibido - Factura ${invoiceNumber} - ${process.env.COMPANY_NAME || 'Agencia Marketing'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #059669; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ ¡Pago recibido!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${contactName}</strong>,</p>
          <p>Hemos recibido correctamente el pago de <strong>${total.toFixed(2)}€</strong> correspondiente a la factura <strong>${invoiceNumber}</strong> de <strong>${businessName}</strong>.</p>
          <p>Gracias por tu confianza. Estamos trabajando para que tu negocio crezca.</p>
          <p>Si tienes cualquier duda, no dudes en contactarnos.</p>
          <p>¡Gracias!<br><strong>Equipo de ${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}

export function projectReadyEmail(contactName: string, businessName: string, serviceName: string, remainingTotal: number, invoiceNumber: string, payUrl: string): EmailTemplate {
  return {
    subject: `🎉 ${serviceName} listo para entregar - ${businessName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c3aed; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🎉 ¡Tu proyecto está acabado!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${contactName}</strong>,</p>
          <p>Buenas noticias: hemos terminado <strong>${serviceName}</strong> para <strong>${businessName}</strong> y ya está listo para entregarte.</p>
          <p>Para recibirlo, solo falta abonar la factura restante de <strong>${remainingTotal.toFixed(2)}€</strong> (factura <strong>${invoiceNumber}</strong>).</p>
          <p style="text-align: center; margin: 28px 0;">
            <a href="${payUrl}" style="background: #7c3aed; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Abonar y recibir mi proyecto</a>
          </p>
          <p>En cuanto confirmemos el pago, te lo entregamos de inmediato.</p>
          <p>¡Gracias por tu confianza!<br><strong>Equipo de ${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
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

export function reportNotification(clientName: string, businessName: string, period: string): EmailTemplate {
  return {
    subject: `📊 Tu informe de marketing - ${period}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #059669; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">📊 Informe Disponible</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
          <p>Hola <strong>${clientName}</strong>,</p>
          <p>Tu informe de marketing de <strong>${businessName}</strong> para <strong>${period}</strong> ya está disponible.</p>
          <p>Encontrarás un resumen de todas las actividades realizadas y los resultados obtenidos.</p>
          <p>Si tienes alguna pregunta sobre el informe, no dudes en contactarnos.</p>
          <p>¡Seguimos trabajando para hacer crecer tu negocio!</p>
          <p><strong>Equipo de ${process.env.COMPANY_NAME || 'Agencia Marketing'}</strong></p>
        </div>
      </body>
      </html>
    `,
  }
}
