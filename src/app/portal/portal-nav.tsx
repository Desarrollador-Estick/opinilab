"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

export function PortalNav() {
  const pathname = usePathname()

  // En la pantalla de cambio de contraseña no se muestra la navegación
  // del portal (Inicio / Herramientas / Salir): es un flujo aislado.
  if (pathname === "/portal/cambiar-password") return null

  return (
    <>
      <nav className="hidden sm:flex items-center gap-1">
        <Link
          href="/portal"
          className="text-blue-100/70 hover:text-white hover:bg-white/10 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        >
          Inicio
        </Link>
        <Link
          href="/portal/herramientas"
          className="text-blue-100/70 hover:text-white hover:bg-white/10 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        >
          Herramientas
        </Link>
      </nav>

      <div className="h-5 w-px bg-white/10 hidden sm:block" />

      <form action="/auth/logout" method="POST">
        <button
          type="submit"
          className="text-sm text-blue-200/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
        >
          Salir
        </button>
      </form>
    </>
  )
}