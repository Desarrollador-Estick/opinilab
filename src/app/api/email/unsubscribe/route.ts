import { createServerAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { verifyUnsubscribeToken, addEmailSuppression } from "@/lib/email/unsubscribe"

// Página pública de baja: el enlace firmado que va en los correos de
// promoción/campaña. Verifica la firma HMAC antes de dar de baja el email.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = (url.searchParams.get("email") || "").trim().toLowerCase()
  const sig = url.searchParams.get("sig") || ""

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !verifyUnsubscribeToken(email, sig)) {
    return new Response(
      page(
        "Enlace no válido",
        "El enlace de baja no es válido o ya ha expirado. Si seguís recibiendo correos, responde a uno de ellos pidiendo la baja."
      ),
      {
        status: 400,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    )
  }

  const supabase = isServiceRoleConfigured() ? await createServerAdminClient() : await createClient()
  await addEmailSuppression(supabase, email)

  return new Response(
    page(
      "☑️ Te has dado de baja",
      `Hemos eliminado <strong>${email}</strong> de nuestros envíos de promoción y campaña. No volverás a recibir correos comerciales nuestros.`
    ),
    { headers: { "content-type": "text/html; charset=utf-8" } }
  )
}

function page(title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title></head>
    <body style="font-family: Arial, sans-serif; background:#f9fafb; margin:0; padding:40px 16px;">
      <div style="max-width:480px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:32px; text-align:center;">
        <h1 style="font-size:20px; color:#111827; margin:0 0 12px;">${title}</h1>
        <p style="color:#6b7280; font-size:14px; line-height:1.6; margin:0 0 24px;">${body}</p>
        <a href="https://opinilab.com" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px;">Ir a OpiniLab</a>
        <p style="color:#9ca3af; font-size:12px; margin-top:24px;">OpiniLab · C/ Barcelona, La Coruña 15010</p>
      </div>
    </body>
    </html>`
}