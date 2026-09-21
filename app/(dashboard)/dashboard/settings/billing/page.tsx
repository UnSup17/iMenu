'use client'

import React, { useState, useEffect } from 'react'
import { PlanTier } from '@prisma/client'

interface SubscriptionData {
  subscription: {
    id: string
    tier: PlanTier
    status: string
    currentPeriodEnd: string
    trialEndsAt: string | null
    discountPercent?: number
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
    priceMonthlyMXN: number
    priceYearlyMXN: number
    priceMonthlyUSD: number
    priceYearlyUSD: number
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
      priceMonthlyMXN: number
      priceYearlyMXN: number
      priceMonthlyUSD: number
      priceYearlyUSD: number
      maxBranches: number
      features: string[]
    }
  >
}

interface ReferralStats {
  code: string
  discountPercent: number
  currentDiscountEarned: number
  totalUses: number
  referredOrgsCount: number
  shareUrl: string
  whatsappShareUrl: string
}

export default function SaaSPlanBillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [referrals, setReferrals] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedCurrency, setSelectedCurrency] = useState<'COP' | 'MXN' | 'USD'>('COP')
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const [subRes, refRes] = await Promise.allSettled([
        fetch('/api/billing/subscription'),
        fetch('/api/referrals'),
      ])

      if (subRes.status === 'fulfilled' && subRes.value.ok) {
        const json = await subRes.value.json()
        setData(json)
      } else {
        throw new Error('Error al obtener datos de suscripción')
      }

      if (refRes.status === 'fulfilled' && refRes.value.ok) {
        const refJson = await refRes.value.json()
        setReferrals(refJson)
      }
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
          currency: selectedCurrency,
          directUpgrade: false, // Inicia flujo Stripe Checkout
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

  const handleCopyLink = () => {
    if (!referrals?.shareUrl) return
    navigator.clipboard.writeText(referrals.shareUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const getFormattedPrice = (plan: any) => {
    const isYearly = billingInterval === 'yearly'
    if (selectedCurrency === 'MXN') {
      const val = isYearly ? plan.priceYearlyMXN : plan.priceMonthlyMXN
      return `$${val.toLocaleString('es-MX')} MXN`
    }
    if (selectedCurrency === 'USD') {
      const val = isYearly ? plan.priceYearlyUSD : plan.priceMonthlyUSD
      return `$${val.toLocaleString('en-US')} USD`
    }
    const val = isYearly ? plan.priceYearlyCOP : plan.priceMonthlyCOP
    return `$${val.toLocaleString('es-CO')} COP`
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header con selectores de Divisa e Intervalo */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Moneda (COP / MXN / USD) */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center gap-1">
            {(['COP', 'MXN', 'USD'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedCurrency === curr
                    ? 'bg-zinc-800 text-amber-400 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {curr}
              </button>
            ))}
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
              Mensual
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
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold text-white">Tu Plan Actual:</span>
                <span className="text-sm font-black px-3 py-1 rounded-full bg-amber-500 text-zinc-950">
                  {data.currentPlan.name}
                </span>
                {data.statusInfo.isTrial && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                    ⏱️ Trial Gratuito ({data.statusInfo.daysRemaining} días restantes)
                  </span>
                )}
                {data.subscription.discountPercent ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    🎁 {data.subscription.discountPercent}% Descuento Activo
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Capacidad utilizada:{' '}
                <span className="font-bold text-zinc-200">
                  {data.branchInfo.currentCount} de{' '}
                  {data.branchInfo.maxAllowed === -1 || data.branchInfo.maxAllowed >= 999
                    ? 'Ilimitadas'
                    : data.branchInfo.maxAllowed}{' '}
                  sucursales
                </span>
              </p>
            </div>

            <div className="text-left md:text-right">
              <span className="text-xs text-zinc-500 block">Próxima fecha de corte</span>
              <span className="font-bold text-zinc-200 text-sm">
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Comparativa de Planes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(data.availablePlans) as PlanTier[]).map((tierKey) => {
              const plan = data.availablePlans[tierKey]
              const isCurrent = data.subscription.tier === tierKey
              const isPro = tierKey === 'PRO'
              const formattedPrice = getFormattedPrice(plan)

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
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {formattedPrice}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">
                        / {billingInterval === 'yearly' ? 'año' : 'mes'}
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
                        ? 'Conectando con Stripe...'
                        : `Elegir ${plan.name}`}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tarjeta del Programa de Referidos */}
          {referrals && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-72 h-36 bg-amber-500/5 blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤝</span>
                    <h2 className="text-xl font-bold text-white">
                      Programa de Referidos iMenu
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Invita a otros restaurantes o colegas gastronómicos y acumula descuentos en tu facturación mensual.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    20% OFF para tus amigos • 10% OFF para ti
                  </span>
                </div>
              </div>

              {/* Grid de Métricas de Referidos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                  <span className="text-xs text-zinc-500 font-medium block">Tu Código de Invitación</span>
                  <span className="text-lg font-black text-amber-400 tracking-wider">
                    {referrals.code}
                  </span>
                </div>
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                  <span className="text-xs text-zinc-500 font-medium block">Restaurantes Invitados</span>
                  <span className="text-lg font-black text-white">
                    {referrals.referredOrgsCount} negocios
                  </span>
                </div>
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                  <span className="text-xs text-zinc-500 font-medium block">Descuento Ganado</span>
                  <span className="text-lg font-black text-emerald-400">
                    {referrals.currentDiscountEarned}% de descuento
                  </span>
                </div>
              </div>

              {/* Barra de Enlace y Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
                <input
                  readOnly
                  value={referrals.shareUrl}
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none w-full"
                />
                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700 whitespace-nowrap cursor-pointer"
                >
                  {copiedLink ? '✅ ¡Enlace Copiado!' : '📋 Copiar Enlace'}
                </button>
                <a
                  href={referrals.whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <span>💬 Compartir en WhatsApp</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
