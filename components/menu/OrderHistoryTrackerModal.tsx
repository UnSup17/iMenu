'use client'

import { useCartStore } from '@/store/cart-store'
import { type ConfirmedOrderPayload } from '@/types/websocket-events'
import { type Locale, translations } from '@/lib/i18n/menu-translations'

interface OrderHistoryTrackerModalProps {
  isOpen: boolean
  onClose: () => void
  orders?: ConfirmedOrderPayload[]
  currency: string
  tableNumber?: number
  restaurantId?: string
  tableId?: string
  sessionToken?: string
  userAlias?: string
  estimatedMinutes?: number
  kitchenPace?: 'calm' | 'normal' | 'busy'
  onOpenFeedback?: () => void
  locale?: Locale
}

const STATUS_STEPS = [
  { key: 'RECEIVED', icon: '📥', stepIndex: 1 },
  { key: 'PREPARING', icon: '🍳', stepIndex: 2 },
  { key: 'READY', icon: '🔔', stepIndex: 3 },
  { key: 'DELIVERED', icon: '🍽️', stepIndex: 4 },
]

export function OrderHistoryTrackerModal({
  isOpen,
  onClose,
  orders,
  currency,
  tableNumber = 1,
  restaurantId,
  tableId,
  sessionToken,
  userAlias,
  estimatedMinutes = 20,
  kitchenPace = 'normal',
  onOpenFeedback,
  locale = 'es',
}: OrderHistoryTrackerModalProps) {
  const storeOrders = useCartStore((s) => s.confirmedOrders)
  const effectiveOrders = orders && orders.length > 0 ? orders : storeOrders
  const t = translations[locale] || translations.es

  if (!isOpen) return null

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
    }).format(amount)

  const totalTableConfirmed = effectiveOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const totalItemsCount = effectiveOrders.reduce((sum, o) => sum + o.itemsCount, 0)

  // Determinar el estado general de la mesa (el más temprano entre las órdenes activas)
  let generalStatus = 'DELIVERED'
  if (effectiveOrders.some((o) => o.status === 'RECEIVED')) {
    generalStatus = 'RECEIVED'
  } else if (effectiveOrders.some((o) => o.status === 'PREPARING')) {
    generalStatus = 'PREPARING'
  } else if (effectiveOrders.some((o) => o.status === 'READY')) {
    generalStatus = 'READY'
  }

  const currentStepNumber =
    STATUS_STEPS.find((s) => s.key === generalStatus)?.stepIndex ?? 4

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return t.statusReceived
      case 'PREPARING':
        return t.statusPreparing
      case 'READY':
        return t.statusReady
      case 'DELIVERED':
        return t.statusDelivered
      case 'CANCELLED':
        return t.statusCancelled
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl text-white relative">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📦</span>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t.myOrders} • {t.table} {tableNumber}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {effectiveOrders.length} {effectiveOrders.length === 1 ? 'ronda confirmada' : 'rondas confirmadas'} • {totalItemsCount} {t.items}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Live Kitchen Tracker Card */}
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                {t.orderStatus}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[11px]">
                <span>⏱️</span>
                <span>
                  ~{estimatedMinutes} {t.minutes} ({kitchenPace === 'busy' ? t.kitchenBusy : t.kitchenNormal})
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="relative pt-2">
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-zinc-800 -z-0" />
              <div
                className="absolute top-6 left-6 h-0.5 bg-amber-500 transition-all duration-500 -z-0"
                style={{
                  width: `${((currentStepNumber - 1) / (STATUS_STEPS.length - 1)) * 100}%`,
                }}
              />

              <div className="flex justify-between items-center relative z-10">
                {STATUS_STEPS.map((step) => {
                  const isPassed = currentStepNumber >= step.stepIndex
                  const isCurrent = currentStepNumber === step.stepIndex
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                          isCurrent
                            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/30 scale-110'
                            : isPassed
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                        }`}
                      >
                        {step.icon}
                      </div>
                      <span
                        className={`text-[10px] font-semibold text-center leading-tight ${
                          isCurrent
                            ? 'text-amber-400 font-bold'
                            : isPassed
                            ? 'text-zinc-300'
                            : 'text-zinc-600'
                        }`}
                      >
                        {getStatusLabel(step.key)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Orders Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Historial de Rondas
            </h3>

            {effectiveOrders.map((order, oIdx) => (
              <div
                key={order.orderId}
                className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-bold text-white">
                      {t.orderRound} #{oIdx + 1}
                    </span>
                    <span className="text-zinc-500 text-[11px]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      order.status === 'READY'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : order.status === 'PREPARING'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between text-xs gap-3 py-1"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-200">
                          <span className="text-amber-400 font-bold mr-1.5">
                            {item.quantity}×
                          </span>
                          {item.name}
                        </div>
                        {item.orderedByNames && item.orderedByNames.length > 0 && (
                          <span className="text-[10px] text-zinc-500 block">
                            👤 {item.orderedByNames.join(', ')}
                          </span>
                        )}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-[10px] text-zinc-400">
                            {item.modifiers.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-zinc-300 font-semibold shrink-0">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 rounded-b-3xl space-y-3 shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-zinc-400">{t.totalToPay}</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {formatPrice(totalTableConfirmed)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenFeedback()
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⭐</span>
                <span>{t.rateExperience}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer text-center"
            >
              {t.addMoreDishes}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
