import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { groqChat } from "@/lib/ai/groq"
import { generateGbpReport } from "@/lib/ai/gbp-report"

// Ejecuta la IA correspondiente a un servicio de un cliente según su categoría.
// Cada categoría de servicio (reviews, seo, email, social_media, ads, branding,
// web) dispara un entregable de contenido generado con LLM (Groq).
export async function POST(request: Request) {
  try {
    const { client_id, category } = await request.json()

    if (!client_id || !category) {
      return NextResponse.json(
        { success: false, error: "client_id y category son obligatorios" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single()

    if (error || !client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      )
    }

    const businessName = client.business_name || "tu negocio"
    const contactName = client.contact_name || ""
    const googleMapsUrl = client.google_maps_url || null

    let result: { ok: boolean; content?: string; error?: string } = {
      ok: false,
      error: "Categoría de servicio no reconocida",
    }

    switch (category) {
      case "seo": {
        result = await generateGbpReport({
          businessName,
          contactName,
          googleMapsUrl,
          message: client.notes || client.industry || null,
        })
        break
      }

      case "reviews": {
        const { data: review } = await supabase
          .from("reviews")
          .select("*")
          .eq("client_id", client_id)
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

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

        const content = await groqChat(
          [
            { role: "system", content: "Eres un redactor de marketing experto en gestionar reputación online." },
            { role: "user", content: prompt },
          ],
          { model: "qwen/qwen3.8-27b", temperature: 0.7, maxTokens: 350 }
        )
        result = { ok: true, content }
        break
      }

      case "email": {
        const prompt = `Eres el encargado de marketing de ${process.env.COMPANY_NAME || "OpiniLab"}, una agencia de marketing para negocios locales. Redacta un email de seguimiento para el cliente potencial ${businessName} (contacto: ${contactName || "no indicado"}).

Reglas:
- Asunto breve y atractivo.
- Cuerpo en español formal y cercano, máximo 120 palabras.
- Recuerda el valor de los servicios (gestión de reseñas, redes sociales, SEO local, publicidad online).
- Incluye una llamada a la acción clara para agendar una llamada.
- No inventes precios ni datos concretos.`
        const content = await groqChat(
          [
            { role: "system", content: "Eres un experto en email marketing B2B para agencias de marketing." },
            { role: "user", content: prompt },
          ],
          { model: "qwen/qwen3.8-27b", temperature: 0.7, maxTokens: 350 }
        )
        result = { ok: true, content }
        break
      }

      case "social_media": {
        const prompt = `Eres el community manager de ${businessName}. Redacta un borrador de publicación para redes sociales (Instagram/Facebook/LinkedIn).

Reglas:
- Tono acorde al tipo de negocio.
- Máximo 3 frases de texto más una lista de 3-5 hashtags relevantes.
- Incluye una llamada a la acción.
- No inventes promociones, precios ni datos concretos que no conozcas.`
        const content = await groqChat(
          [
            { role: "system", content: "Eres un redactor experto en social media para negocios locales." },
            { role: "user", content: prompt },
          ],
          { model: "qwen/qwen3.8-27b", temperature: 0.7, maxTokens: 300 }
        )
        result = { ok: true, content }
        break
      }

      case "ads":
      case "branding":
      case "web": {
        const label =
          category === "ads"
            ? "publicidad online"
            : category === "branding"
              ? "identidad de marca"
              : "presencia web"
        const prompt = `Eres un consultor de marketing de ${process.env.COMPANY_NAME || "OpiniLab"}. Redacta una propuesta breve de ${label} para el negocio ${businessName} (contacto: ${contactName || "no indicado"}).

Reglas:
- Máximo 120 palabras, en español formal y cercano.
- Describe en 2-3 puntos qué incluiría el servicio y qué resultados puedes esperar en general, sin prometer cifras concretas.
- Termina con una invitación a agendar una llamada de diagnóstico.`
        const content = await groqChat(
          [
            { role: "system", content: "Eres un consultor senior de marketing digital para agencias." },
            { role: "user", content: prompt },
          ],
          { model: "qwen/qwen3.8-27b", temperature: 0.7, maxTokens: 300 }
        )
        result = { ok: true, content }
        break
      }
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          category,
          error: result.error || "Error al ejecutar la IA",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      category,
      client_id,
      content: result.content,
    })
  } catch (error) {
    console.error("Run AI service error:", error)
    return NextResponse.json(
      { success: false, error: "Error al ejecutar la IA para el servicio" },
      { status: 500 }
    )
  }
}
