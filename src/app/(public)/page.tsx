import Link from "next/link"
import ContactForm from "@/components/contact-form"

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-sm text-blue-100 font-medium">Tu agencia de marketing digital</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              Haz crecer tu negocio,{" "}
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
                nosotros nos encargamos de todo
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Más reseñas de Google, más clientes y más visibilidad. Gestionamos tu reputación online, tus redes, tu SEO y tus anuncios para que tú te dediques a tu negocio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="#contacto"
                className="group relative bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-300 shadow-2xl shadow-white/10 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Solicitar presupuesto
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#servicios"
                className="border border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                Ver servicios
              </a>
            </div>
          </div>

          {/* Result preview */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 bg-white/10 rounded-lg px-4 py-1.5 text-xs text-gray-400 font-mono">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    opinilab.com/tu-negocio
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Nuevos clientes/mes", value: "+38", change: "+23%", color: "text-green-400" },
                  { label: "Reseñas Google", value: "4.9", change: "+45%", color: "text-yellow-400" },
                  { label: "Posición Google Maps", value: "#1", change: "Top 3", color: "text-blue-400" },
                  { label: "Visitas web/mes", value: "+2.1K", change: "+18%", color: "text-purple-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white font-[family-name:var(--font-heading)]">{stat.value}</p>
                    <p className={`text-xs mt-1 font-medium ${stat.color}`}>{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-sm font-medium text-gray-300 mb-3 font-[family-name:var(--font-heading)]">Desarrollo de tu reputación</p>
                  <div className="flex items-end gap-3 h-28">
                    {[
                      { h: 25, m: "Ene" }, { h: 40, m: "Feb" }, { h: 35, m: "Mar" },
                      { h: 55, m: "Abr" }, { h: 60, m: "May" }, { h: 75, m: "Jun" },
                    ].map((bar, i) => (
                      <div key={bar.m} className="flex-1 flex flex-col gap-1">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${
                            i === 5
                              ? "bg-gradient-to-t from-blue-600 to-cyan-400"
                              : "bg-white/10 hover:bg-white/15"
                          }`}
                          style={{ height: `${bar.h}%` }}
                        />
                        <span className="text-[10px] text-gray-500 text-center">{bar.m}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-gray-300 mb-2 font-[family-name:var(--font-heading)]">Tu nota en Google</p>
                  <div className="text-center">
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-[family-name:var(--font-heading)]">4.9</p>
                    <div className="flex justify-center gap-0.5 mt-2" role="img" aria-label="4.9 de 5 estrellas">
                      {[1,2,3,4,5].map((s) => (
                        <svg key={s} className={`w-4 h-4 ${s <= 5 ? "text-yellow-400" : "text-yellow-400/40"}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">+312 reseñas este mes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-14 bg-white border-b border-[var(--color-border)]" aria-label="Negocios que confían en nosotros">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-gray-400 mb-8 uppercase tracking-[0.2em] font-semibold">
          Negocios que confían en nosotros
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-30">
          {["Clínica Dental Sol", "Restaurante La Brasa", "Peluquería Estilo", "Ferretería Central", "Auto Taller Max"].map((name) => (
            <div key={name} className="text-xl font-bold text-gray-900 tracking-tight font-[family-name:var(--font-heading)]">
              {name}
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "120+", label: "Negocios gestionados" },
              { value: "15K+", label: "Reseñas conseguidas" },
              { value: "+180%", label: "Crecimiento medio en clientes" },
              { value: "4.9/5", label: "Valoración media de nuestros clientes" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-[var(--color-primary)] font-[family-name:var(--font-heading)]">
                  {stat.value}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Servicios
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Todo lo que tu negocio necesita para crecer
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Servicios de marketing digital pensados para negocios locales. Sin permanencias ocultas ni sorpresas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ),
                title: "Gestión de Reseñas Google",
                description: "Captamos reseñas positivas de tus clientes satisfechos y gestionamos las negativas con profesionalidad. Más estrellas, más confianza, más clientes.",
                price: "199€/mes",
                featured: true,
                gradient: "from-yellow-400 to-orange-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2" />
                  </svg>
                ),
                title: "Community Management",
                description: "Nos hacemos cargo de tus redes sociales: contenido, planificación y publicación. Tu marca siempre activa y profesional.",
                price: "499€/mes",
                gradient: "from-pink-500 to-rose-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: "SEO & Posicionamiento",
                description: "Aparece en los primeros resultados de Google cuando tus clientes te buscan. Posicionamiento local y nacional.",
                price: "Desde 299€/mes",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Publicidad Online",
                description: "Google Ads y Meta Ads gestionados por expertos. Cada euro invertido rinde al máximo para atraer clientes.",
                price: "399€/mes",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: "Email Marketing",
                description: "Convierte a tus clientes en repetición. Campañas y newsletters que fidelizan y generan ventas.",
                price: "249€/mes",
                gradient: "from-violet-500 to-purple-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                ),
                title: "Landing Pages",
                description: "Páginas diseñadas para convertir visitas en clientes. Ideales para campañas publicitarias y captación de leads.",
                price: "599€ · Una vez",
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                ),
                title: "Branding",
                description: "Logo, imagen y identidad de marca profesional. Que tu negocio transmita la confianza que merece.",
                price: "Desde 799€",
                gradient: "from-pink-500 to-rose-500",
              },
            ].map((service) => (
              <div
                key={service.title}
                className={`group relative bg-white border rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
                  service.featured
                    ? "border-2 border-[var(--color-primary)] shadow-xl shadow-blue-100/60"
                    : "border-[var(--color-border)] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 font-[family-name:var(--font-heading)]">
                  {service.title}
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-4">
                  {service.description}
                </p>
                <p className="text-lg font-bold text-[var(--color-primary)] font-[family-name:var(--font-heading)]">
                  {service.price}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--color-muted-foreground)] mt-10">
            ¿No sabes qué necesitas? Pide una <a href="#contacto" className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer">auditoría gratuita de tu negocio</a>.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-24 bg-[var(--color-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Cómo funciona
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Empezar es muy sencillo
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Nos encargamos de todo por ti. Tú solo te dedicas a tu negocio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Auditoría gratuita",
                description: "Analizamos tu presencia online, tus reseñas y la de tu competencia. Te decimos qué puedes mejorar.",
              },
              {
                step: "02",
                title: "Plan a medida",
                description: "Diseñamos un plan con los servicios que tu negocio necesita. Sin servicios que no te sirven.",
              },
              {
                step: "03",
                title: "Empezamos a trabajar",
                description: "Gestionamos tu reputación, tus redes, tu SEO y tus anuncios. Tú recibes reportes claros de resultados.",
              },
              {
                step: "04",
                title: "Tu negocio crece",
                description: "Más reseñas, más visibilidad y más clientes. Revisamos y optimizamos constantemente los resultados.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 -translate-x-1/2" />
                )}
                <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] relative hover:shadow-lg transition-shadow duration-300">
                  <span className="text-5xl font-extrabold text-blue-50 absolute top-4 right-4 font-[family-name:var(--font-heading)] select-none">
                    {item.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold mb-4 relative">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 relative font-[family-name:var(--font-heading)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed relative">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="resultados" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              Resultados
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Negocios reales, resultados reales
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] max-w-2xl mx-auto">
              Esto es lo que conseguir para opinilab hizo crecer sus reservas, ventas y reputación.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Pasamos de 2 estrellas a 4.8 en Google en 4 meses. Los clientes nuevos nos dicen que eligieron nuestra clínica por las reseñas.",
                author: "María García",
                role: "Clínica Dental Sol",
                avatar: "MG",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                quote: "Con la publicidad de Google Ads y la nueva landing page las reservas subieron un 35%. El equipo publica mis redes sin que yo tenga que preocuparme.",
                author: "Carlos Ruiz",
                role: "Restaurante La Brasa",
                avatar: "CR",
                gradient: "from-orange-500 to-red-500",
              },
              {
                quote: "Antes nadie encontraba mi taller a menos que me conocieran. Ahora salgo el primero en Google Maps. El retorno de la inversión es evidente.",
                author: "Ana Martínez",
                role: "Auto Taller Max",
                avatar: "AM",
                gradient: "from-purple-500 to-pink-500",
              },
            ].map((t) => (
              <div key={t.author} className="bg-[var(--color-muted)] rounded-2xl p-8 border border-[var(--color-border)] hover:shadow-lg transition-shadow duration-300">
                <div className="flex gap-1 mb-4" role="img" aria-label="5 de 5 estrellas">
                  {[1,2,3,4,5].map((s) => (
                    <svg key={s} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-foreground)] text-sm">{t.author}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-foreground)] mt-3 mb-4 font-[family-name:var(--font-heading)]">
              Preguntas frecuentes
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "¿En cuánto tiempo veré resultados?",
                a: "Depende del servicio. La gestión de reseñas suele notarse en las primeras semanas. El SEO y la publicidad suelen dar resultados visibles en 2-3 meses. Te lo explicamos claro desde el inicio.",
              },
              {
                q: "¿Hay permanencia o contratos largos?",
                a: "No. Trabajamos mes a mes sin permanencia. Si no quedas satisfecho con el servicio, puedes cancelar cuando quieras, solo necesitamos un aviso de 30 días.",
              },
              {
                q: "¿Cuánto cuesta empezar?",
                a: "La primera auditoría de tu negocio es totalmente gratuita. Solo pagas cuando decidimos lanzar un plan de trabajo juntos, y solo por los servicios que necesitas.",
              },
              {
                q: "¿Quién se encarga de responder a las reseñas?",
                a: "Nosotros. Respondemos a todas las reseñas, positivas y negativas, con un tono profesional y en nombre de tu negocio. Así tú no pierdes tiempo y tu imagen queda bien cuidada.",
              },
              {
                q: "¿Necesito daros acceso total a mi negocio?",
                a: "Solo a lo imprescindible para trabajar: tu perfil de negocio en Google, redes sociales y plataformas publicitarias. Tú mantienes siempre el control y la propiedad de tus cuentas.",
              },
              {
                q: "¿Gestionáis negocios de cualquier sector?",
                a: "Sí. Trabajamos con clínicas, restaurantes, peluquerías, talleres, ferreterías y muchos más sectores. Cada negocio tiene su plan adaptado a su público.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group bg-[var(--color-muted)] rounded-xl border border-[var(--color-border)] overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer select-none font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors">
                  {faq.q}
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200 shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-6 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="py-24 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e40af] text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-[family-name:var(--font-heading)]">
            ¿Listo para hacer crecer tu negocio?
          </h2>
          <p className="text-blue-100/80 text-lg mb-10 max-w-xl mx-auto">
            Solicita tu auditoría gratuita. No tienes nada que perder y mucho que ganar.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
