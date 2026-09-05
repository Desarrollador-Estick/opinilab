"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Clientes", href: "/dashboard/clientes", icon: "👥" },
  { name: "Leads", href: "/dashboard/leads", icon: "🎯" },
  { name: "Servicios", href: "/dashboard/servicios", icon: "🧩" },
  { name: "Reseñas", href: "/dashboard/resenas", icon: "⭐" },
  { name: "Marketing", href: "/dashboard/marketing", icon: "📱" },
  { name: "Contratos", href: "/dashboard/contratos", icon: "📋" },
  { name: "Facturas", href: "/dashboard/facturas", icon: "💰" },
  { name: "Reportes", href: "/dashboard/reportes", icon: "📈" },
  { name: "Tareas", href: "/dashboard/tareas", icon: "✅" },
  { name: "Tareas IA", href: "/dashboard/ai-tareas", icon: "🤖" },
  { name: "Configuración", href: "/dashboard/configuracion", icon: "⚙️" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">🚀 OpiniLab</h1>
          <p className="text-xs text-gray-400 mt-1">Panel de Control</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
              J
            </div>
            <div>
              <p className="text-sm font-medium">Jordi</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {navigation.find((n) => n.href === pathname)?.name || "Dashboard"}
          </h2>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
