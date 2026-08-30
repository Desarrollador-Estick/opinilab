import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { groqChat } from "@/lib/ai/groq"

// Genera un borrador de respuesta a una reseña usando Groq (IA gratuita).
export async function POST(request: Request) {
  try {
    const { review_id } = await request.json()
    if (!review_id) {
      return NextResponse.json(
        { success: false, error: "review_id es obligatorio" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: review, error } = await supabase
      .from("reviews")
      .select("*, clients(business_name)")
      .eq("id", review_id)
      .single()

    if (error || !review) {
      return NextResponse.json(
        { success: false, error: "Reseña no encontrada" },
        { status: 404 }
      )
    }

    const businessName = review.clients?.business_name ?? "tu negocio"
    const rating = review.rating ?? 0
    const reviewer = review.reviewer_name ?? "nuestro cliente"
    const reviewText = review.review_text ?? ""

    const prompt = `
Eres el encargado de marketing de ${businessName}. Escribe una respuesta profesional y cordial a la siguiente reseña de Google.

Valoración del cliente: ${rating} de 5 estrellas
Nombre del cliente: ${reviewer}
Texto de la reseña: "${reviewText}"

Reglas:
- Responde en español formal y cercano.
- Agradece al cliente por su tiempo y su opinión.
- Si la valoración es positiva (4-5), refuerza el agradecimiento y menciona que se alegran de su experiencia.
- Si la valoración es negativa (1-3), discúlpate, muestra empatía sin excusas vacías, y ofrece un canal o vía para resolver el problema. NO inventes soluciones concretas que no puedas garantizar.
- Máximo 4 frases. No uses emojis.
- No inventes nombres de personas ni datos que no estén en la reseña.
`

    const groqRes = await groqChat(
      [
        { role: "system", content: "Eres un redactor de marketing experto en gestionar reputación online." },
        { role: "user", content: prompt },
      ],
      { model: "qwen/qwen3.8-27b", temperature: 0.7, maxTokens: 250 }
    )

    return NextResponse.json({ success: true, draft: groqRes })
  } catch (error) {
    console.error("AI review draft error:", error)
    return NextResponse.json(
      { success: false, error: "Error al generar la respuesta" },
      { status: 500 }
    )
  }
}
