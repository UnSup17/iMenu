'use client'

import React, { useState } from 'react'

export interface BillPaymentItem {
  id: string
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
  restaurantLogo?: string | null
  status: 'PENDING' | 'PAID' | 'VOIDED'
  totalAmount: number
  paidAt?: string | null
  invoiceNumber?: string | null
  items?: Array<{
    name: string
    quantity: number
    subtotal: number
  }>
}

interface FoodCourtBillSheetProps {
  isOpen: boolean
  onClose: () => void
  foodCourtId: string
  foodCourtName: string
  tableNumber: number
  sessionId: string
  payments: BillPaymentItem[]
  currency: string
  isStaff?: boolean
  isHighContrast?: boolean
  onPaymentUpdated?: (updated: BillPaymentItem) => void
}

export function FoodCourtBillSheet({
  isOpen,
  onClose,
  foodCourtId,
  foodCourtName,
  tableNumber,
  sessionId,
  payments,
  currency,
  isStaff = false,
  isHighContrast = false,
  onPaymentUpdated,
}: FoodCourtBillSheetProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 0,
    }).format(amount)

  const totalAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0)
  const paidAmount = payments
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + p.totalAmount, 0)
  const pendingAmount = payments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.totalAmount, 0)

  const paidCount = payments.filter((p) => p.status === 'PAID').length
  const totalCount = payments.length
  const isAllPaid = totalCount > 0 && paidCount === totalCount

  const handleMarkAsPaid = async (payment: BillPaymentItem) => {
    try {
      setProcessingId(payment.restaurantId)
      setErrorMsg(null)

      const res = await fetch(`/api/food-courts/${foodCourtId}/payments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          restaurantId: payment.restaurantId,
          status: 'PAID',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar pago')
      }

      const updated = await res.json()
      if (onPaymentUpdated) {
        onPaymentUpdated({
          ...payment,
          status: 'PAID',
          paidAt: updated.paidAt,
        })
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al procesar cobro')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-court-bill-title"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div
        className={`relative z-10 w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border ${
          isHighContrast
            ? 'bg-black text-white border-2 border-amber-400'
            : 'bg-zinc-950 text-white border-zinc-800'
        }`}
      >
        {/* Handle for mobile drawer */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {foodCourtName}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                Mesa {tableNumber}
              </span>
            </div>
            <h2 id="food-court-bill-title" className="text-xl font-black mt-1 tracking-tight">
              Cuenta de la Mesa
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Checklist de cobro por restaurante individual
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar cuenta"
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 bg-zinc-900/60 border-b border-zinc-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">
              Progreso de pago:
            </span>
            <span className="font-bold text-amber-400">
              {paidCount} de {totalCount} restaurantes
            </span>
          </div>

          {isAllPaid ? (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">
              ✓ MESA COMPLETA Y PAGADA
            </span>
          ) : (
            <span className="font-medium text-amber-400/90 text-[11px]">
              Saldo pendiente: {formatPrice(pendingAmount)}
            </span>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Payments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-sm">
              No hay pedidos registrados aún para esta mesa.
            </div>
          ) : (
            payments.map((p) => {
              const isPaid = p.status === 'PAID'
              const isProcessing = processingId === p.restaurantId

              return (
                <div
                  key={p.restaurantId}
                  className={`rounded-2xl p-4 transition-all duration-200 border ${
                    isPaid
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isHighContrast
                      ? 'bg-black border-zinc-700'
                      : 'bg-zinc-900/80 border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {p.restaurantLogo ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                          <img
                            src={p.restaurantLogo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center shrink-0">
                          {p.restaurantName.charAt(0)}
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-white">
                          {p.restaurantName}
                        </h4>
                        <span className="text-xs text-zinc-400 block mt-0.5">
                          Total: <strong className="text-white font-semibold">{formatPrice(p.totalAmount)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          PAGADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for Waiter/Staff or Customer instruction */}
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                    {isPaid ? (
                      <span className="text-zinc-500 text-[11px]">
                        Cobro registrado exitosamente.
                      </span>
                    ) : (
                      <>
                        <span className="text-zinc-400">
                          Pago individual al mesero
                        </span>
                        <button
                          onClick={() => handleMarkAsPaid(p)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          {isProcessing ? (
                            <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span>Marcar pagado</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Totals */}
        <div className="p-6 bg-zinc-900/90 border-t border-zinc-800/80 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400 font-medium">Total de la mesa:</span>
            <span className="text-lg font-black text-white">{formatPrice(totalAmount)}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-400 font-medium">Pagado hasta el momento:</span>
            <span className="font-bold text-emerald-400">{formatPrice(paidAmount)}</span>
          </div>

          {pendingAmount > 0 && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-800">
              <span className="text-amber-400 font-medium">Pendiente de cobro:</span>
              <span className="font-black text-amber-400 text-sm">{formatPrice(pendingAmount)}</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors mt-2"
          >
            Regresar al Menú / Mosaico
          </button>
        </div>
      </div>
    </div>
  )
}
