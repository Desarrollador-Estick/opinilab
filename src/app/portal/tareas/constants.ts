import { Database } from "@/types/database"

export type AiTaskCategory = Database["public"]["Tables"]["ai_tasks"]["Insert"]["service_category"]

export const AI_TASK_LABEL: Record<AiTaskCategory, string> = {
  reviews: "Respuesta a reseñas",
  seo: "Informe SEO / Google Business Profile",
  email: "Email de marketing",
  social_media: "Publicación en redes sociales",
  ads: "Propuesta de publicidad",
  branding: "Propuesta de branding",
  web: "Propuesta de web",
}

export const AI_TASK_STATUS_LABEL: Record<string, string> = {
  queued: "En cola",
  waiting: "En espera (cupo agotado)",
  processing: "Procesando",
  done: "Completada",
  failed: "Error",
}
