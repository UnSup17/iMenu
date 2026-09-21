'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') || 'PRO'
  const interval = searchParams.get('interval') === 'yearly' ? 'Anual' : 'Mensual'

  const tierNames: Record<string, string> = {
    BASIC: 'Plan Básico',
    PRO: 'Plan Profesional (Franquicias)',
    ENTERPRISE: 'Plan Empresarial',
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-zinc-900/90 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-500/10 text-center space-y-6 relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner">
          🎉
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Pago Confirmado
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ¡Suscripción Activada con Éxito!
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Tu organización ha sido actualizada a{' '}
            <strong className="text-white font-bold">{tierNames[tier] || tier}</strong> en ciclo{' '}
            <span className="text-amber-400 font-semibold">{interval}</span>.
          </p>
        </div>

        {/* Card de Beneficios Desbloqueados */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-3">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Beneficios Disponibles de Inmediato
          </span>
          <ul className="space-y-2 text-xs text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Menú QR sin límite de comandas ni comisiones ocultas</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Control de inventario, mermas y costeo de recetas en tiempo real</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Facturación electrónica y tickets térmicos POS</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Módulo de analíticas avanzadas, predicción y modo TV para gerencia</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚀 Ir al Panel de Control</span>
          </Link>
          <Link
            href="/dashboard/settings/billing"
            className="flex-1 py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all border border-zinc-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💳 Ver Facturación</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500">Cargando confirmación...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
