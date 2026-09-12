'use client'

import { useState, useMemo } from 'react'
import { type ConfirmedOrderPayload } from '@/types/websocket-events'
import { type Locale, translations } from '@/lib/i18n/menu-translations'

interface SplitBillPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orders: ConfirmedOrderPayload[]
  currency: string
  tableNumber: number
  tableId: string
  sessionId?: string
  restaurantId: string
  userAlias?: string
  locale?: Locale
  onPaymentSuccess?: (paidAmount: number, reference: string) => void
}

type SplitMode = 'INDIVIDUAL' | 'EQUAL' | 'CUSTOM' | 'FULL'
type GatewayMethod = 'WOMPI' | 'MERCADOPAGO' | 'STRIPE' | 'NEQUI' | 'CARD'

export function SplitBillPaymentModal({
  isOpen,
  onClose,
  orders,
  currency,
  tableNumber,
  tableId,
  sessionId,
  restaurantId,
  userAlias = '',
  locale = 'es',
  onPaymentSuccess,
}: SplitBillPaymentModalProps) {
  const t = translations[locale] || translations.es

  const [splitMode, setSplitMode] = useState<SplitMode>('INDIVIDUAL')
  const [numPeople, setNumPeople] = useState<number>(2)
  const [selectedCustomItemKeys, setSelectedCustomItemKeys] = useState<string[]>([])
  const [tipPercent, setTipPercent] = useState<number>(10)
  const [gatewayMethod, setGatewayMethod] = useState<GatewayMethod>('WOMPI')
  
  // Formulario del pagador
  const [payerName, setPayerName] = useState(userAlias || '')
  const [payerEmail, setPayerEmail] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242')
  
  // Estados de transacción
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvedVoucher, setApprovedVoucher] = useState<{
    paymentReference: string
    amount: number
    tipAmount: number
    totalPaid: number
    date: string
  } | null>(null)

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)

  // Extraer todos los ítems de todas las rondas
  const allOrderItems = useMemo(() => {
    const list: {
      key: string
      orderId: string
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
      orderedByNames?: string[]
      isMyItem: boolean
    }[] = []

    orders.forEach((o, oIdx) => {
      o.items.forEach((item, iIdx) => {
        const isMyItem =
          Boolean(userAlias) &&
          Boolean(
            item.orderedByNames &&
              item.orderedByNames.some(
                (n) => n.trim().toLowerCase() === userAlias.trim().toLowerCase()
              )
          )

        list.push({
          key: `${o.orderId}-${item.id}-${iIdx}`,
          orderId: o.orderId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          orderedByNames: item.orderedByNames,
          isMyItem,
        })
      })
    })

    return list
  }, [orders, userAlias])

  // Total global de la mesa
  const totalTableConfirmed = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.totalAmount, 0)
  }, [orders])

  // Total correspondiente a "Mi Consumo Individual"
  const myIndividualItems = useMemo(() => {
    return allOrderItems.filter((i) => i.isMyItem)
  }, [allOrderItems])

  const myIndividualSubtotal = useMemo(() => {
    // Si hay platos atribuidos a mí, sumarlos
    if (myIndividualItems.length > 0) {
      return myIndividualItems.reduce((sum, i) => sum + i.totalPrice, 0)
    }
    // Fallback: Si no hay marcas por comensal, sugerir partes iguales
    return Math.round(totalTableConfirmed / Math.max(numPeople, 1))
  }, [myIndividualItems, totalTableConfirmed, numPeople])

  // Cálculo del monto base según la modalidad elegida
  const baseAmount = useMemo(() => {
    switch (splitMode) {
      case 'INDIVIDUAL':
        return myIndividualSubtotal
      case 'EQUAL':
        return Math.round(totalTableConfirmed / Math.max(numPeople, 1))
      case 'CUSTOM': {
        const selected = allOrderItems.filter((i) => selectedCustomItemKeys.includes(i.key))
        return selected.reduce((sum, i) => sum + i.totalPrice, 0)
      }
      case 'FULL':
        return totalTableConfirmed
    }
  }, [splitMode, myIndividualSubtotal, totalTableConfirmed, numPeople, allOrderItems, selectedCustomItemKeys])

  const tipAmount = Math.round((baseAmount * tipPercent) / 100)
  const grandTotal = baseAmount + tipAmount

  const toggleCustomItem = (key: string) => {
    setSelectedCustomItemKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // Enviar y procesar pago en pasarela
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (grandTotal <= 0) {
      setError('El monto a pagar debe ser mayor a cero.')
      return
    }
    if (!payerName.trim()) {
      setError('Por favor escribe tu nombre para el comprobante.')
      return
    }

    setError(null)
    setProcessing(true)

    try {
      // Simular latencia de validación con pasarela (Wompi/MercadoPago/Stripe)
      await new Promise((res) => setTimeout(res, 1200))

      const res = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          sessionId: sessionId || null,
          restaurantId,
          payerName: payerName.trim(),
          payerPhone: payerPhone.trim() || null,
          payerEmail: payerEmail.trim() || null,
          splitType: splitMode,
          amount: baseAmount,
          tipAmount,
          totalPaid: grandTotal,
          paymentMethod: gatewayMethod,
          itemsPaid:
            splitMode === 'INDIVIDUAL'
              ? myIndividualItems
              : splitMode === 'CUSTOM'
              ? allOrderItems.filter((i) => selectedCustomItemKeys.includes(i.key))
              : [{ description: `División ${splitMode}`, amount: baseAmount }],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al procesar el pago')
        setProcessing(false)
        return
      }

      setApprovedVoucher({
        paymentReference: data.voucher.paymentReference,
        amount: baseAmount,
        tipAmount,
        totalPaid: grandTotal,
        date: new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })

      if (onPaymentSuccess) {
        onPaymentSuccess(grandTotal, data.voucher.paymentReference)
      }
    } catch {
      setError('Error de conexión al contactar la pasarela de pago')
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💳</span>
            <div>
              <h2 className="text-base font-bold text-white">Dividir Cuenta & Auto-Pago</h2>
              <p className="text-[11px] text-zinc-400">
                Mesa #{tableNumber} • Total comanda: <strong className="text-amber-400 font-mono">{formatPrice(totalTableConfirmed)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {approvedVoucher ? (
            /* Pantalla de Comprobante de Pago Aprobado */
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20">
                ✓
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  Transacción Aprobada
                </span>
                <h3 className="text-2xl font-black text-white mt-2">¡Pago Realizado con Éxito!</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tu parte ha sido pagada y acreditada a la mesa #{tableNumber}.
                </p>
              </div>

              {/* Recibo digital ticket */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 sm:p-5 text-left space-y-3 font-mono text-xs shadow-inner">
                <div className="flex justify-between pb-2 border-b border-zinc-800/80">
                  <span className="text-zinc-500">Referencia:</span>
                  <span className="text-amber-400 font-bold">{approvedVoucher.paymentReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pagador:</span>
                  <span className="text-white font-bold">{payerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pasarela:</span>
                  <span className="text-white font-bold">{gatewayMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Modalidad:</span>
                  <span className="text-zinc-300 font-sans">
                    {splitMode === 'INDIVIDUAL'
                      ? 'Mi Consumo Personal'
                      : splitMode === 'EQUAL'
                      ? 'Parte Igualitaria'
                      : splitMode === 'CUSTOM'
                      ? 'Platos Seleccionados'
                      : 'Cuenta Completa'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal:</span>
                  <span className="text-white">{formatPrice(approvedVoucher.amount)}</span>
                </div>
                {approvedVoucher.tipAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Propina Voluntaria ({tipPercent}%):</span>
                    <span>{formatPrice(approvedVoucher.tipAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-black text-white">
                  <span>TOTAL PAGADO:</span>
                  <span className="text-emerald-400 font-extrabold">{formatPrice(approvedVoucher.totalPaid)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `¡Hola! Acabo de pagar mi parte de la cuenta en iMenu (Mesa #${tableNumber}). Comprobante: ${approvedVoucher.paymentReference} por ${formatPrice(approvedVoucher.totalPaid)}.`
                    )
                    window.open(`https://wa.me/?text=${msg}`, '_blank')
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>📲</span>
                  <span>Compartir por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs cursor-pointer transition-colors"
                >
                  Volver al Menú
                </button>
              </div>
            </div>
          ) : (
            /* Flujo de Configuración y Pago */
            <form onSubmit={handleProcessPayment} className="space-y-5">
              {/* Selector de Modalidad de División */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  1. ¿Cómo deseas pagar?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('INDIVIDUAL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                      splitMode === 'INDIVIDUAL'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md scale-[1.02]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">👤</span>
                    <span className="truncate w-full">Mi Consumo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('EQUAL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                      splitMode === 'EQUAL'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md scale-[1.02]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">⚖️</span>
                    <span className="truncate w-full">Partes Iguales</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('CUSTOM')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                      splitMode === 'CUSTOM'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md scale-[1.02]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">📋</span>
                    <span className="truncate w-full">Elegir Platos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitMode('FULL')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                      splitMode === 'FULL'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md scale-[1.02]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">👑</span>
                    <span className="truncate w-full">Toda la Mesa</span>
                  </button>
                </div>
              </div>

              {/* Detalle según modalidad */}
              {splitMode === 'INDIVIDUAL' && (
                <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-zinc-300 pb-1 border-b border-zinc-800">
                    <span>Platos pedidos por ti ({userAlias || 'Comensal actual'}):</span>
                    <span className="text-amber-400 font-mono">{formatPrice(myIndividualSubtotal)}</span>
                  </div>
                  {myIndividualItems.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {myIndividualItems.map((item) => (
                        <div key={item.key} className="flex justify-between text-zinc-300 text-[11px]">
                          <span>
                            {item.quantity}× {item.name}
                          </span>
                          <span className="font-mono text-zinc-400">{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400 italic">
                      No se encontraron platos etiquetados con tu nombre. Se ha calculado una cuota equitativa sugerida de {formatPrice(myIndividualSubtotal)}.
                    </p>
                  )}
                </div>
              )}

              {splitMode === 'EQUAL' && (
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400 block">¿Entre cuántas personas dividir?</span>
                    <span className="text-white font-bold text-sm">{numPeople} comensales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNumPeople((prev) => Math.max(2, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-amber-400 text-sm">{numPeople}</span>
                    <button
                      type="button"
                      onClick={() => setNumPeople((prev) => Math.min(12, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {splitMode === 'CUSTOM' && (
                <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 text-xs">
                  <span className="font-bold text-zinc-300 block pb-1 border-b border-zinc-800">
                    Marca los platos que vas a pagar:
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {allOrderItems.map((item) => {
                      const isChecked = selectedCustomItemKeys.includes(item.key)
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500/40 text-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCustomItem(item.key)}
                              className="accent-amber-500 rounded"
                            />
                            <span className="truncate text-xs">
                              {item.quantity}× {item.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs shrink-0 ml-2">{formatPrice(item.totalPrice)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Selector de Propina Voluntaria */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-bold uppercase tracking-wider text-zinc-400">
                    2. Propina Voluntaria Sugerida
                  </label>
                  <span className="text-amber-400 font-mono font-bold text-xs">{formatPrice(tipAmount)}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipPercent(pct)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        tipPercent === pct
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-black'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pct === 0 ? 'Sin propina' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Pasarela */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  3. Selecciona tu Pasarela de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGatewayMethod('WOMPI')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      gatewayMethod === 'WOMPI'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🟣</span>
                    <span className="font-sans text-[11px]">Wompi / Nequi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGatewayMethod('MERCADOPAGO')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      gatewayMethod === 'MERCADOPAGO'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">🔵</span>
                    <span className="font-sans text-[11px]">Mercado Pago / PSE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGatewayMethod('CARD')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      gatewayMethod === 'CARD'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">💳</span>
                    <span className="font-sans text-[11px]">Tarjeta Débito/Crédito</span>
                  </button>
                </div>
              </div>

              {/* Datos del pagador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Nombre para el comprobante *</label>
                  <input
                    type="text"
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Tu nombre o apodo"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Celular / WhatsApp (opcional)</label>
                  <input
                    type="tel"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="300 123 4567"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Resumen Final y Botón de Pago */}
              <div className="pt-3 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-zinc-400 block text-xs">Total a pagar ahora:</span>
                    <span className="text-xs text-zinc-500">Incluye {formatPrice(tipAmount)} de propina</span>
                  </div>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {formatPrice(grandTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={processing || grandTotal <= 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 cursor-pointer transition-all active:scale-[0.99]"
                >
                  {processing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Conectando con Pasarela Segura...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒 Pagar {formatPrice(grandTotal)} con {gatewayMethod}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-500">
                  <span>🔒 Encriptación SSL 256-bit</span>
                  <span>•</span>
                  <span>PCI-DSS Compliant</span>
                  <span>•</span>
                  <span>Comprobante instantáneo</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
