import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Genera un borrador de respuesta a una reseña usando Groq (IA gratuita).
// La API de Groq es compatible con OpenAI (chat completions).
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

export async function POST(request: Request) {
  try {
    const { review_id } = await request.json()
    if (!review_id) {
      return NextResponse.json(
        { success: false, error: "review_id es obligatorio" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GROQ_API_KEY no configurada" },
        { status: 500 }
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

    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Eres un redactor de marketing experto en gestionar reputación online." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error("Groq error:", errText)
      return NextResponse.json(
        { success: false, error: "Error al generar la respuesta con la IA" },
        { status: 502 }
      )
    }

    const data = await groqRes.json()
    const draft = data.choices?.[0]?.message?.content?.trim() ?? ""

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error("AI review draft error:", error)
    return NextResponse.json(
      { success: false, error: "Error al generar la respuesta" },
      { status: 500 }
    )
  }
}
