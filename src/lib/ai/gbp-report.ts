import { groqChat } from "@/lib/ai/groq"

export type GbpReportInput = {
  businessName: string
  contactName: string
  googleMapsUrl: string | null
  message: string | null
}

export type GbpReportResult = {
  ok: boolean
  content?: string
  error?: string
}

const SYSTEM_PROMPT = `Eres un consultor de marketing local y reputación online. Redactas informes profesionales, en español, para negocios que quieren mejorar su presencia en Google (Google Business Profile), sus reseñas y su visibilidad local. Usas un tono cercano, concreto y con recomendaciones accionables. Nunca inventes datos numéricos (valoraciones, número de reseñas, posicionamiento) que no conozcas: si no tienes el dato, habla en términos generales y describe cómo medirlo/mejorarlo.`

/**
 * Genera un informe de estado y oportunidades en Google Business Profile
 * a partir únicamente de los datos que introduce el visitante en el formulario
 * (nombre del negocio, contacto, mensaje y, si aporta, el enlace de Google Maps).
 */
export async function generateGbpReport(input: GbpReportInput): Promise<GbpReportResult> {
  const userPrompt = `
Genera un informe claro y estructurado para el negocio "${input.businessName}" (contacto: ${input.contactName || "no indicado"}).

Contexto extra que ha facilitado el cliente:
- Mensaje/consulta: ${input.message || "no indicó mensaje"}
- Enlace de Google Maps: ${input.googleMapsUrl || "no lo ha facilitado"}

Estructura el informe en estas secciones (usa encabezados con ## y listas con guiones, en texto plano simple para email):

## Análisis actual
Describe de forma realista los puntos habituales de mejora en la presencia online de un negocio de este tipo, sin inventar datos concretos (valoración, número de reseñas, etc.). Si el cliente no facilitó el enlace, indícalo y sugiere que nos lo comparta para hacer un análisis personalizado.

## Oportunidades de mejora
Enumera 4-6 mejoras accionables y concretas para su perfil de negocio en Google y su reputación online.

## Cómo podemos ayudarte desde ${process.env.COMPANY_NAME || "OpiniLab"}
Explica, en 3-4 puntos, los servicios que ofrecemos (gestión de reseñas, community management, SEO local, publicidad online) y cómo se traducen en resultados (más reseñas, mejor valoración media, más visibilidad y más clientes locales).

## Siguiente paso
Invita a que el cliente agende una llamada o responda a este email para conseguir un análisis personalizado gratuito.

Longitud: concisa, máximo 350 palabras. En español formal y cercano.`
  try {
    const content = await groqChat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 900 }
    )
    return { ok: true, content }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error generando el informe" }
  }
}
