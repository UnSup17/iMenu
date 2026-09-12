'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const steps = [
  {
    id: 1,
    badge: 'Paso 1 de 4',
    title: '¡Bienvenido a iMenu!',
    subtitle: 'Tu restaurante digital está listo para despegar.',
    description:
      'iMenu transforma la experiencia de tus comensales mediante menús interactivos, pedidos en tiempo real directo a cocina y control financiero total.',
    icon: '🎉',
    features: [
      'Menú digital interactivo en alta velocidad',
      'Comandas instantáneas con WebSockets',
      'Facturación y cuadre de caja diario',
    ],
    ctaText: 'Comenzar configuración',
  },
  {
    id: 2,
    badge: 'Paso 2 de 4',
    title: 'Diseña tu menú y categorías',
    subtitle: 'Carga tus platos, fotos, precios y modificadores.',
    description:
      'Organiza tu carta por categorías como Entradas, Fuertes, Bebidas y Postres. Define ingredientes removibles, combos y adiciones.',
    icon: '🍽️',
    features: [
      'Subida de fotos atractivas y descripciones',
      'Modificadores como término de carne o salsas',
      'Control de disponibilidad en un solo clic',
    ],
    ctaLink: '/dashboard/categories',
    ctaText: 'Ir a Gestor de Menú →',
  },
  {
    id: 3,
    badge: 'Paso 3 de 4',
    title: 'Configura tus mesas y códigos QR',
    subtitle: 'Cada mesa tendrá un QR único e inteligente.',
    description:
      'Imprime los códigos QR para tus mesas. Tus clientes simplemente escanean con su cámara, exploran el menú interactivo y piden sin demoras.',
    icon: '🪑',
    features: [
      'Generación y descarga de QRs listos para imprimir',
      'Zonificación (Terraza, Salón, Barra)',
      'Sesiones seguras y control de estados de mesa',
    ],
    ctaLink: '/dashboard/tables',
    ctaText: 'Gestionar Mesas →',
  },
  {
    id: 4,
    badge: 'Paso 4 de 4',
    title: '¡Todo listo para operar!',
    subtitle: 'Tu panel de control en vivo está activo.',
    description:
      'Ya puedes recibir órdenes en tiempo real, asignar meseros, emitir facturas y supervisar el rendimiento de tu negocio.',
    icon: '🚀',
    features: [
      'Pantalla KDS en cocina en tiempo real',
      'Notificaciones sonoras para nuevos pedidos',
      'Métricas de ventas y productos más pedidos',
    ],
    ctaLink: '/dashboard/orders',
    ctaText: 'Entrar al Dashboard de Pedidos →',
  },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const step = steps[currentStep]

  function nextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      router.push('/dashboard/orders')
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between z-10 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-lg shadow-lg shadow-amber-500/20">
            iM
          </span>
          <span className="font-bold text-xl tracking-tight text-white">iMenu Onboarding</span>
        </div>

        <Link
          href="/dashboard/orders"
          className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 transition-colors"
        >
          Saltar e ir al Dashboard ✕
        </Link>
      </header>

      {/* Main Card */}
      <main className="z-10 max-w-2xl mx-auto w-full my-auto py-8">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between mb-6">
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {step.badge}
            </span>
            <span className="text-4xl">{step.icon}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            {step.title}
          </h2>
          <p className="text-amber-400 font-medium text-sm sm:text-base mb-4">
            {step.subtitle}
          </p>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6">
            {step.description}
          </p>

          <div className="space-y-2.5 mb-8 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Características clave:
            </p>
            {step.features.map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </span>
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
            {currentStep > 0 ? (
              <button
                onClick={prevStep}
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {step.ctaLink ? (
                <Link
                  href={step.ctaLink}
                  className="flex-1 sm:flex-initial text-center px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all"
                >
                  {step.ctaText}
                </Link>
              ) : (
                <button
                  onClick={nextStep}
                  type="button"
                  className="flex-1 sm:flex-initial px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {step.ctaText}
                </button>
              )}

              {currentStep < steps.length - 1 && (
                <button
                  onClick={nextStep}
                  type="button"
                  className="px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Siguiente →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="z-10 text-center text-xs text-zinc-600 py-2">
        iMenu Cloud — Plataforma integral de gestión gastronómica
      </footer>
    </div>
  )
}
