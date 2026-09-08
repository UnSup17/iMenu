'use client'

import { useState, useEffect } from 'react'
import { PlanTier } from '@prisma/client'

interface SubscriptionData {
  subscription: {
    id: string
    tier: PlanTier
    status: string
    currentPeriodEnd: string
    trialEndsAt: string | null
  }
  statusInfo: {
    isActive: boolean
    isTrial: boolean
    daysRemaining: number
  }
  branchInfo: {
    allowed: boolean
    currentCount: number
    maxAllowed: number
    tier: PlanTier
  }
  currentPlan: {
    tier: PlanTier
    name: string
    description: string
    priceMonthlyCOP: number
    priceYearlyCOP: number
    maxBranches: number
    features: string[]
  }
  availablePlans: Record<
    PlanTier,
    {
      tier: PlanTier
      name: string
      description: string
      priceMonthlyCOP: number
      priceYearlyCOP: number
      maxBranches: number
      features: string[]
    }
  >
}

export default function SaaSPlanBillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/subscription')
      if (!res.ok) throw new Error('Error al obtener datos de suscripción')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  const handleUpgrade = async (targetTier: PlanTier) => {
    setError(null)
    setMessage(null)
    setUpgradingTier(targetTier)

    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: targetTier,
          interval: billingInterval,
          directUpgrade: true,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error al procesar la suscripción')
      }

      const resData = await res.json()
      if (resData.url) {
        window.location.href = resData.url
      } else {
        setMessage(`¡Plan actualizado con éxito a ${targetTier}!`)
        fetchSubscription()
      }
    } catch (err: any) {
      setError(err.message || 'Error en la suscripción')
    } finally {
      setUpgradingTier(null)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Planes y Suscripción SaaS
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Administra tu membresía iMenu, facturación mensual/anual y límites de sucursales.
          </p>
        </div>

        {/* Toggle Mes / Año */}
        <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              billingInterval === 'monthly'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Facturación Mensual
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              billingInterval === 'yearly'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Anual <span className="text-[10px] text-emerald-400 font-bold ml-1">(-20%)</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-sm font-medium text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Cargando detalles de tu suscripción...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Banner de Estado Actual */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-white">Tu Plan Actual:</span>
                <span className="text-sm font-black px-3 py-1 rounded-full bg-amber-500 text-zinc-950">
                  {data.currentPlan.name}
                </span>
                {data.statusInfo.isTrial && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                    ⏱️ Trial Gratuito ({data.statusInfo.daysRemaining} días restantes)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Capacidad utilizada:{' '}
                <span className="font-bold text-zinc-200">
                  {data.branchInfo.currentCount} de{' '}
                  {data.branchInfo.maxAllowed === -1 ? 'Ilimitadas' : data.branchInfo.maxAllowed}{' '}
                  sucursales
                </span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-zinc-500 block">Próxima fecha de corte</span>
              <span className="font-bold text-zinc-200 text-sm">
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-CO')}
              </span>
            </div>
          </div>

          {/* Comparativa de Planes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(data.availablePlans) as PlanTier[]).map((tierKey) => {
              const plan = data.availablePlans[tierKey]
              const isCurrent = data.subscription.tier === tierKey
              const isPro = tierKey === 'PRO'
              const price =
                billingInterval === 'yearly' ? plan.priceYearlyCOP : plan.priceMonthlyCOP

              return (
                <div
                  key={tierKey}
                  className={`bg-zinc-900/80 border rounded-2xl p-6 flex flex-col justify-between transition relative ${
                    isCurrent
                      ? 'border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500'
                      : isPro
                      ? 'border-zinc-700 hover:border-amber-500/50'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full">
                      Más Popular (Franquicias)
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">{plan.description}</p>

                    <div className="my-5">
                      <span className="text-3xl font-black text-white">
                        ${(price / 1000).toLocaleString('es-CO')}k
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">
                        COP / {billingInterval === 'yearly' ? 'año' : 'mes'}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-zinc-300 border-t border-zinc-800/80 pt-4">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-zinc-800/80">
                    <button
                      onClick={() => handleUpgrade(tierKey)}
                      disabled={isCurrent || upgradingTier === tierKey}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-zinc-800 text-zinc-500 cursor-default'
                          : isPro
                          ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                      }`}
                    >
                      {isCurrent
                        ? 'Plan Actual'
                        : upgradingTier === tierKey
                        ? 'Procesando...'
                        : `Elegir ${plan.name}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
