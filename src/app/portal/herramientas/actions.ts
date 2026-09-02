"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/database"

type ToolType = Database["public"]["Tables"]["client_tools"]["Insert"]["tool_type"]

export type ClientToolState = {
  error?: string
  success?: boolean
}

async function assertOwnClient(supabase: any, clientId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .maybeSingle()

  const isAgency = ["admin", "manager", "member"].includes(profile?.role)
  if (isAgency) return true
  return profile?.role === "client" && profile?.client_id === clientId
}

export async function addClientToolAction(
  clientId: string,
  formData: FormData
): Promise<ClientToolState> {
  const supabase = await createClient()

  const own = await assertOwnClient(supabase, clientId)
  if (!own) return { error: "No tienes permisos para añadir herramientas a este cliente." }

  const toolType = formData.get("tool_type") as ToolType
  const toolName = (formData.get("tool_name") as string)?.trim()
  const url = ((formData.get("url") as string) || "").trim() || null
  const username = ((formData.get("username") as string) || "").trim() || null
  const password_enc = ((formData.get("password_enc") as string) || "").trim() || null
  const notes = ((formData.get("notes") as string) || "").trim() || null

  if (!toolType || !toolName) {
    return { error: "El tipo y el nombre de la herramienta son obligatorios." }
  }

  const { error } = await supabase.from("client_tools").insert({
    client_id: clientId,
    tool_type: toolType,
    tool_name: toolName,
    url,
    username,
    password_enc,
    notes,
  })
  if (error) return { error: error.message }

  revalidatePath("/portal/herramientas")
  return { success: true }
}

export async function updateClientToolAction(
  clientId: string,
  tool: {
    id: string
    tool_type: ToolType
    tool_name: string
    url?: string | null
    username?: string | null
    password_enc?: string | null
    notes?: string | null
  },
  formData: FormData
): Promise<ClientToolState> {
  const supabase = await createClient()

  const own = await assertOwnClient(supabase, clientId)
  if (!own) return { error: "No tienes permisos para modificar herramientas de este cliente." }

  const toolType = (formData.get("tool_type") as ToolType) || tool.tool_type
  const toolName = ((formData.get("tool_name") as string) || "")?.trim() || tool.tool_name
  const url = ((formData.get("url") as string) || "").trim() || null
  const username = ((formData.get("username") as string) || "").trim() || null
  const password_enc = ((formData.get("password_enc") as string) || "").trim() || null
  const notes = ((formData.get("notes") as string) || "").trim() || null

  const { error } = await supabase
    .from("client_tools")
    .update({
      tool_type: toolType,
      tool_name: toolName,
      url:
        tool.url !== undefined && (formData.get("url") as string) === ""
          ? null
          : url,
      username:
        tool.username !== undefined && (formData.get("username") as string) === ""
          ? null
          : username,
      password_enc:
        tool.password_enc !== undefined && (formData.get("password_enc") as string) === ""
          ? null
          : password_enc,
      notes:
        tool.notes !== undefined && (formData.get("notes") as string) === ""
          ? null
          : notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tool.id)
    .eq("client_id", clientId)
  if (error) return { error: error.message }

  revalidatePath("/portal/herramientas")
  return { success: true }
}

export async function deleteClientToolAction(
  clientId: string,
  toolId: string
): Promise<ClientToolState> {
  const supabase = await createClient()

  const own = await assertOwnClient(supabase, clientId)
  if (!own) return { error: "No tienes permisos para eliminar herramientas de este cliente." }

  const { error } = await supabase
    .from("client_tools")
    .delete()
    .eq("id", toolId)
    .eq("client_id", clientId)
  if (error) return { error: error.message }

  revalidatePath("/portal/herramientas")
  return { success: true }
}
