import Link from 'next/link'
import { PLAN_CONFIGS } from '@/lib/subscription'
import { PlanTier } from '@prisma/client'

export default function PublicPricingPage() {
  const plans = Object.keys(PLAN_CONFIGS) as PlanTier[]

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500 selection:text-zinc-950">
      {/* Navbar simplificado */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-800/60">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black text-amber-500 tracking-widest uppercase">iMenu</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
            Empresarial
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition shadow-lg shadow-amber-500/10"
          >
            Comenzar Prueba Gratis (14 Días)
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-16 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          Planes Flexibles para Gastronomía
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white max-w-2xl mx-auto">
          Potencia tu Restaurante o Franquicia con iMenu
        </h1>
        <p className="text-base text-zinc-400 max-w-xl mx-auto">
          Desde un local individual hasta cadenas de múltiples sucursales con contabilidad, arqueo de caja e inventario en tiempo real.
        </p>

        {/* Grid de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 text-left">
          {plans.map((tierKey) => {
            const plan = PLAN_CONFIGS[tierKey]
            const isPro = tierKey === 'PRO'

            return (
              <div
                key={tierKey}
                className={`bg-zinc-900/90 border rounded-3xl p-8 flex flex-col justify-between relative transition ${
                  isPro
                    ? 'border-amber-500 shadow-2xl shadow-amber-500/10 ring-1 ring-amber-500'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[11px] font-black uppercase tracking-widest px-4 py-0.5 rounded-full shadow-md">
                    Recomendado Franquicias
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-400 mt-2 min-h-[36px]">{plan.description}</p>

                  <div className="my-6">
                    <span className="text-4xl font-black text-white">
                      ${(plan.priceMonthlyCOP / 1000).toLocaleString('es-CO')}k
                    </span>
                    <span className="text-xs text-zinc-400 ml-1">COP / mes</span>
                  </div>

                  <ul className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800/80 pt-6">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="text-amber-400 font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8 mt-8 border-t border-zinc-800/80">
                  <Link
                    href="/login"
                    className={`w-full block text-center py-3 rounded-xl text-xs font-bold transition ${
                      isPro
                        ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                    }`}
                  >
                    Prueba Gratis 14 Días
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
