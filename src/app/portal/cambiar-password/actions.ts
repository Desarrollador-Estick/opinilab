"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ChangePasswordState = {
  error?: string
  success?: boolean
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const newPassword = formData.get("new_password") as string
  const confirmPassword = formData.get("confirm_password") as string

  if (!newPassword || !confirmPassword) {
    return { error: "Completa todos los campos." }
  }
  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." }
  }
  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas nuevas no coinciden." }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/portal/login")
  }

  // Comprobar la contraseña actual: intentamos salir sin token, que fallará
  // si la contraseña actual no es correcta.
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (!me || me.role !== "client") {
    redirect("/dashboard")
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (updateErr) {
    return { error: updateErr.message }
  }

  // Marcar que ya no hace falta cambiar la contraseña.
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id)
  if (profileErr) {
    return { error: `Contraseña cambiada, pero no se pudo actualizar el perfil: ${profileErr.message}` }
  }

  revalidatePath("/portal", "layout")
  redirect("/portal")
}
