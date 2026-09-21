'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function CheckoutCancelContent() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-amber-500/5 text-center space-y-6 relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-inner">
          ⏸️
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Proceso Cancelado
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Pago no completado
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            No se realizó ningún cargo a tu tarjeta o método de pago. Puedes retomar la activación de tu plan en cualquier momento.
          </p>
          {reason && (
            <p className="text-xs text-zinc-500 italic">
              Motivo: {reason}
            </p>
          )}
        </div>

        {/* Card Informativa */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-left space-y-3">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold text-xs uppercase tracking-wider">
            <span>🛡️</span>
            <span>Tu servicio no se interrumpe</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tu restaurante y sucursales continúan operando con normalidad bajo tu plan actual o periodo de prueba vigente. Todas tus cartas, mesas y configuraciones están intactas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard/settings/billing"
            className="flex-1 py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💳 Reintentar / Elegir Plan</span>
          </Link>
          <a
            href="https://wa.me/573000000000?text=Hola,%20necesito%20ayuda%20con%20el%20pago%20de%20mi%20suscripción%20en%20iMenu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all border border-zinc-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>💬 Soporte por WhatsApp</span>
          </a>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition underline underline-offset-4"
          >
            Volver al Panel Principal
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500">Cargando...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  )
}
