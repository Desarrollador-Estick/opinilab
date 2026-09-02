// Repartidor de generación de contenido con IA (Groq) por categoría de servicio.
// Compartido entre el endpoint /api/services/run-ai y el worker de cola de tareas
// (ai_tasks), para no duplicar los prompts. Cada categoría produce un entregable.

import { groqChat, type GroqMessage } from "@/lib/ai/groq"

export type ServiceClient = {
  id: string
  business_name?: string | null
  contact_name?: string | null
  google_maps_url?: string | null
  notes?: string | null
  industry?: string | null
}

export type DispatchResult = { ok: true; content: string } | { ok: false; error: string }

type DispatchCtx = {
  client: ServiceClient
  category: string
  review?: {
    rating?: number | null
    reviewer_name?: string | null
    review_text?: string | null
  } | null
}

// Ejecuta la IA correspondiente a una categoría de servicio y devuelve el contenido.
// `review` es opcional (para la categoría "reviews"); si no se pasa, se intenta
// cargar la última reseña sin responder desde la BD vía `loadReview`.
export async function dispatchServiceContent(ctx: DispatchCtx): Promise<DispatchResult> {
  const businessName = ctx.client.business_name || "tu negocio"
  const contactName = ctx.client.contact_name || ""

  let messages: GroqMessage[]
  const model = "qwen/qwen3.8-27b"
  const temperature = 0.7
  let maxTokens = 300

  switch (ctx.category) {
    case "seo":
      return runGbpReport(ctx)
    case "reviews":
      messages = buildReviewMessages(businessName, ctx.review ?? null)
      maxTokens = 350
      break
    case "email": {
      messages = [
        { role: "system", content: "Eres un experto en email marketing B2B para agencias de marketing." },
        {
          role: "user",
          content: `Eres el encargado de marketing de ${process.env.COMPANY_NAME || "OpiniLab"}, una agencia de marketing para negocios locales. Redacta un email de seguimiento para el cliente potencial ${businessName} (contacto: ${contactName || "no indicado"}).

Reglas:
- Asunto breve y atractivo.
- Cuerpo en español formal y cercano, máximo 120 palabras.
- Recuerda el valor de los servicios (gestión de reseñas, redes sociales, SEO local, publicidad online).
- Incluye una llamada a la acción clara para agendar una llamada.
- No inventes precios ni datos concretos.`,
        },
      ]
      maxTokens = 350
      break
    }
    case "social_media": {
      messages = [
        { role: "system", content: "Eres un redactor experto en social media para negocios locales." },
        {
          role: "user",
          content: `Eres el community manager de ${businessName}. Redacta un borrador de publicación para redes sociales (Instagram/Facebook/LinkedIn).

Reglas:
- Tono acorde al tipo de negocio.
- Máximo 3 frases de texto más una lista de 3-5 hashtags relevantes.
- Incluye una llamada a la acción.
- No inventes promociones, precios ni datos concretos que no conozcas.`,
        },
      ]
      maxTokens = 300
      break
    }
    case "ads":
    case "branding":
    case "web": {
      const label =
        ctx.category === "ads"
          ? "publicidad online"
          : ctx.category === "branding"
            ? "identidad de marca"
            : "presencia web"
      messages = [
        { role: "system", content: "Eres un consultor senior de marketing digital para agencias." },
        {
          role: "user",
          content: `Eres un consultor de marketing de ${process.env.COMPANY_NAME || "OpiniLab"}. Redacta una propuesta breve de ${label} para el negocio ${businessName} (contacto: ${contactName || "no indicado"}).

Reglas:
- Máximo 120 palabras, en español formal y cercano.
- Describe en 2-3 puntos qué incluiría el servicio y qué resultados puedes esperar en general, sin prometer cifras concretas.
- Termina con una invitación a agendar una llamada de diagnóstico.`,
        },
      ]
      maxTokens = 300
      break
    }
    default:
      return { ok: false, error: "Categoría de servicio no reconocida" }
  }

  try {
    const content = await groqChat(messages, { model, temperature, maxTokens })
    return { ok: true, content }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al ejecutar la IA" }
  }
}

function buildReviewMessages(businessName: string, review: DispatchCtx["review"]): GroqMessage[] {
  const prompt = review
    ? `Eres el encargado de marketing de ${businessName}. Escribe una respuesta profesional y cordial a la siguiente reseña de Google.

Valoración del cliente: ${review.rating ?? 0} de 5 estrellas
Nombre del cliente: ${review.reviewer_name ?? "nuestro cliente"}
Texto de la reseña: "${review.review_text ?? ""}"

Reglas:
- Responde en español formal y cercano.
- Agradece al cliente por su tiempo y su opinión.
- Si la valoración es positiva (4-5), refuerza el agradecimiento y menciona que se alegran de su experiencia.
- Si la valoración es negativa (1-3), discúlpate, muestra empatía sin excusas vacías, y ofrece un canal o vía para resolver el problema. NO inventes soluciones concretas que no puedas garantizar.
- Máximo 4 frases. No uses emojis.
- No inventes nombres de personas ni datos que no estén en la reseña.`
    : `El negocio ${businessName} aún no tiene reseñas registradas. Redacta una guía breve de 3-4 frases para pedir reseñas a los clientes y mejorar la reputación online. Responde en español formal y cercano, sin inventar datos.`

  return [
    { role: "system", content: "Eres un redactor de marketing experto en gestionar reputación online." },
    { role: "user", content: prompt },
  ]
}

async function runGbpReport(ctx: DispatchCtx): Promise<DispatchResult> {
  try {
    const { generateGbpReport } = await import("@/lib/ai/gbp-report")
    const res = await generateGbpReport({
      businessName: ctx.client.business_name || "tu negocio",
      contactName: ctx.client.contact_name || "",
      googleMapsUrl: ctx.client.google_maps_url || null,
      message: ctx.client.notes || ctx.client.industry || null,
    })
    if (res.ok && res.content) return { ok: true, content: res.content }
    return { ok: false, error: res.error || "Error al generar el informe GBP" }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error al generar el informe GBP" }
  }
}
