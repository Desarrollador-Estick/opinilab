import Link from "next/link"

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                OpiniLab
              </h1>
              <p className="text-xs text-gray-500">Portal de cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <Link
                href="/portal"
                className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                Inicio
              </Link>
              <Link
                href="/portal/herramientas"
                className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                Mis herramientas
              </Link>
            </nav>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
