// Prompt compartido para generar borradores de respuesta a reseñas.
// Lo usan tanto el endpoint /api/reviews/ai como el cron de automatizaciones.
export function buildReviewResponsePrompt(
  businessName: string,
  rating: number,
  reviewer: string,
  reviewText: string
): string {
  return `
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
`.trim()
}