/**
 * Build a WhatsApp wa.me link with a pre-filled message.
 * The link opens WhatsApp Web/App with the message ready to send.
 */

export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, "").replace(/^00/, "+")
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = cleanPhone(phone)
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function buildPromoMessage(
  name: string,
  business: string,
  company: string = process.env.COMPANY_NAME || "OpiniLab"
): string {
  return (
    `Hola ${name} 👋\n\n` +
    `Somos ${company}. Hemos visto ${business} y creemos que podemos ayudarte a:\n` +
    `• Conseguir más reseñas en Google\n` +
    `• Mejorar tu presencia en redes sociales\n` +
    `• Atraer más clientes con SEO local\n\n` +
    `¿Te gustaría una consulta gratuita y sin compromiso?\n\n` +
    `Responde a este mensaje y te contamos cómo podemos empezar 🚀`
  )
}
