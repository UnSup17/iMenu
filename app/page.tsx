import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight">
            i<span className="text-amber-500">Menu</span>
          </span>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950
                         px-4 py-2 rounded-lg transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              Comenzar gratis →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-32 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px]
                          bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400
                           bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            🍽️ Menú digital para restaurantes modernos
          </span>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-none mb-6">
            Tu menú.{' '}
            <span className="text-amber-500">Siempre listo.</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Digitaliza tu restaurante en minutos. Tus clientes escanean un QR, eligen sus platillos
            y el pedido llega directo a cocina — sin fricciones, sin errores.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                         bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold
                         px-8 py-4 rounded-xl transition-all active:scale-95
                         shadow-xl shadow-amber-500/25 text-base"
            >
              Empieza ahora — Es gratis
            </Link>
            <a
              href="#how"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                         border border-zinc-700 hover:border-zinc-500 text-zinc-300
                         hover:text-white px-8 py-4 rounded-xl transition-all text-base"
            >
              ¿Cómo funciona?
            </a>
          </div>
        </div>

        {/* Mock UI preview */}
        <div className="relative max-w-3xl mx-auto mt-20 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="bg-zinc-800/50 px-4 py-3 flex items-center gap-2 border-b border-zinc-700/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4 bg-zinc-700/40 rounded-md h-6 flex items-center px-3">
                <span className="text-xs text-zinc-500">imenu.app/menu/la-trattoria/mesa-4</span>
              </div>
            </div>
            {/* Menu preview */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-white text-sm">La Trattoria</div>
                  <div className="text-xs text-zinc-400">Mesa 4</div>
                </div>
                <div className="bg-amber-500 text-zinc-950 text-sm font-bold px-4 py-2 rounded-xl">🛒 0</div>
              </div>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {['Entradas', 'Pastas', 'Pizzas', 'Postres'].map((c, i) => (
                  <div key={c} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold
                    ${i === 0 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                    {c}
                  </div>
                ))}
              </div>
              {[
                { name: 'Bruschetta al Pomodoro', price: '$89', desc: 'Pan tostado con tomate fresco y albahaca' },
                { name: 'Carpaccio de res', price: '$145', desc: 'Láminas de res con rúcula y parmesano' },
                { name: 'Tabla de quesos artesanales', price: '$220', desc: 'Selección de quesos con mermelada y nueces' },
              ].map((item) => (
                <div key={item.name}
                  className="flex bg-zinc-800/50 border border-zinc-700/40 rounded-xl overflow-hidden">
                  <div className="w-20 h-20 bg-zinc-700/40 flex-shrink-0 flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-sm">{item.price}</span>
                      <span className="text-amber-500 text-sm">→</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -top-3 -right-1 sm:right-4 bg-amber-500 text-zinc-950
                          font-bold text-xs px-4 py-2 rounded-full shadow-lg shadow-amber-500/40 rotate-3">
            ¡Sin instalación!
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 border-t border-zinc-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Todo lo que tu restaurante necesita
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              Sin apps que descargar. Sin hardware caro. Solo un QR y listo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '📱',
                title: 'Menú digital con QR',
                desc: 'Tus clientes escanean el QR de la mesa y acceden al menú al instante desde su celular.',
              },
              {
                icon: '🛒',
                title: 'Pedidos en tiempo real',
                desc: 'Los pedidos llegan inmediatamente al panel. Sin papelitos, sin errores de transcripción.',
              },
              {
                icon: '🔔',
                title: 'Llamada al mesero',
                desc: 'El cliente llama al mesero con un toque. Tu equipo recibe la notificación al instante.',
              },
              {
                icon: '📋',
                title: 'Panel de órdenes',
                desc: 'Vista en tiempo real de todos los pedidos activos, con estados y prioridades.',
              },
              {
                icon: '🎨',
                title: 'Menú personalizable',
                desc: 'Agrega categorías, productos, modificadores e ingredientes removibles sin límite.',
              },
              {
                icon: '⚡',
                title: 'Ultra rápido',
                desc: 'Interfaz optimizada para móvil. Carga en menos de un segundo incluso en redes lentas.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6
                           hover:border-amber-500/30 hover:bg-zinc-800/50 transition-all duration-300"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-6 border-t border-zinc-800/60">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-zinc-400 text-lg">En 3 simples pasos</p>
          </div>
          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Configura tu menú',
                desc: 'Entra al panel, crea tus categorías y agrega tus platillos con fotos, precios y modificadores.',
              },
              {
                step: '02',
                title: 'Imprime tus QRs',
                desc: 'Genera el código QR para cada mesa e imprímelo. Ponlo en el portamenú o en la mesa.',
              },
              {
                step: '03',
                title: 'Tus clientes ordenan',
                desc: 'Ellos escanean, eligen y confirman su pedido. Tú lo ves al instante en tu panel de órdenes.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start group">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20
                                flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <span className="text-amber-500 font-black text-lg">{item.step}</span>
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-white text-lg mb-1">{item.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-zinc-800/60">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800/80 border border-zinc-700/60
                          rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-[60px] pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                ¿Listo para modernizar tu restaurante?
              </h2>
              <p className="text-zinc-400 text-lg mb-8">
                Configura tu menú digital hoy — completamente gratis.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400
                           text-zinc-950 font-bold px-8 py-4 rounded-xl transition-all
                           active:scale-95 shadow-xl shadow-amber-500/25 text-base"
              >
                Comenzar ahora →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-8 px-6 text-center text-zinc-500 text-sm">
        <span className="font-bold text-white">
          i<span className="text-amber-500">Menu</span>
        </span>
        {' '}— Sistema de menú digital para restaurantes.
      </footer>

    </div>
  )
}
