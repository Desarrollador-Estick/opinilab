import { Suspense } from "react"
import { UpdatePasswordForm } from "./update-password-form"

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="py-12 px-4 max-w-4xl mx-auto text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-2">
          OpiniLab
        </h1>
        <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
          Potencia tu negocio con IA. Más reseñas, mejor visibilidad y más clientes.
        </p>
      </div>

      {/* Update Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-md mx-auto mt-8 mb-16 overflow-hidden">
        <Suspense fallback={<p className="text-gray-500 text-sm py-8 text-center">Cargando...</p>}>
          <UpdatePasswordForm />
        </Suspense>
      </div>

      {/* Footer link section */}
      <div className="bg-gray-800 py-6 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-300 text-sm mb-4">
            OpiniLab — Agencia de marketing digital. Gestionamos las reseñas de tu
            negocio en Google, tus redes sociales, tu SEO y tus anuncios para que tu
            negocio crezca.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/servicios" className="text-gray-300 hover:text-blue-300 text-sm font-medium underline">
              Servicios
            </a>
            <a href="#contacto" className="text-gray-300 hover:text-blue-300 text-sm font-medium underline">
              Contacto
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            © 2026 OpiniLab. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}