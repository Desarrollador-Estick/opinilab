export default function NoClientPlaceholder() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-md text-center">
        <div className="text-3xl mb-2">🏢</div>
        <h2 className="text-lg font-bold mb-1">Aún no tienes una ficha vinculada</h2>
        <p className="text-sm text-amber-800">
          Tu cuenta de cliente aún no está asociada a ningún negocio.
          Contacta con tu agencia para que te la configure.
        </p>
      </div>
    </div>
  )
}
