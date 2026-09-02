import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { dispatchServiceContent } from "@/lib/ai/dispatch"
import { isFeatureEnabled, FEATURE_KEYS } from "@/lib/settings"

// Ejecuta la IA correspondiente a un servicio de un cliente según su categoría.
// Cada categoría de servicio (reviews, seo, email, social_media, ads, branding,
// web) dispara un entregable de contenido generado con LLM (Groq).
// Usa `dispatchServiceContent` de lib/ai/dispatch (compartido con la cola de tareas).
export async function POST(request: Request) {
  try {
    const enabled = await isFeatureEnabled(FEATURE_KEYS.marketingAi)
    if (!enabled) {
      return NextResponse.json(
        { success: false, error: "La generación de contenido con IA está desactivada desde la configuración" },
        { status: 403 }
      )
    }

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

    const result = await dispatchServiceContent({
      client: {
        id: client.id,
        business_name: client.business_name,
        contact_name: client.contact_name,
        google_maps_url: client.google_maps_url,
        notes: client.notes,
        industry: client.industry,
      },
      category,
    })

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
