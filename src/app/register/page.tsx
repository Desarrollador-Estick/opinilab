"use client"

import Link from "next/link"

// El auto-registro público de administradores se ha DESACTIVADO por seguridad.
// Antes, cualquiera podía registrarse con rol "admin" y acceder a todo el panel
// (clientes, facturas, contratos...). Ahora las cuentas las crea el administrador
// desde el panel de clientes (rol 'client' vinculado a su ficha).
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            🚀 Agencia Marketing
          </Link>
          <p className="text-gray-500 mt-2">Registro</p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm text-center space-y-4">
          <p className="text-4xl">🔒</p>
          <h2 className="text-xl font-bold">Registro desactivado</h2>
          <p className="text-sm text-gray-500">
            El acceso a la plataforma lo gestiona el administrador. Si eres cliente y
            necesitas acceso a tu portal, contacta con tu agencia para que creen tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Iniciar sesión
          </Link>
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Volver a la web
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
