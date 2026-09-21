'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PreOrderItem, PreOrderData } from '@/lib/reservations/preorder'

interface ProductItem {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
}

interface CategoryItem {
  id: string
  name: string
  products: ProductItem[]
}

interface RestaurantInfo {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  logoUrl: string | null
}

interface Props {
  restaurant: RestaurantInfo
  categories: CategoryItem[]
}

export function CustomerReservationClient({ restaurant, categories }: Props) {
  // Pasos: 1: Agenda & Datos, 2: Pre-orden (opcional), 3: Resumen & Confirmado
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Datos de la reserva
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [time, setTime] = useState('19:30')
  const [partySize, setPartySize] = useState<number>(2)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [specialNotes, setSpecialNotes] = useState('')

  // Pre-orden
  const [preOrderItems, setPreOrderItems] = useState<Record<string, { product: ProductItem; quantity: number; notes?: string }>>({})
  const [paymentOption, setPaymentOption] = useState<'PREPAID' | 'UNPAID'>('UNPAID')
  const [paymentMethod, setPaymentMethod] = useState('CARD')

  // Estado de envío
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmedReservation, setConfirmedReservation] = useState<any | null>(null)

  // Filtro de categorías para la pre-orden
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '')

  // Horarios sugeridos
  const TIME_SLOTS = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  ]

  // Totales de la pre-orden
  const preOrderList: PreOrderItem[] = useMemo(() => {
    return Object.values(preOrderItems).map(({ product, quantity, notes }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
      notes,
    }))
  }, [preOrderItems])

  const preOrderTotal = useMemo(() => {
    return preOrderList.reduce((acc, it) => acc + it.subtotal, 0)
  }, [preOrderList])

  const handleAddItem = (product: ProductItem) => {
    setPreOrderItems((prev) => {
      const current = prev[product.id]
      const quantity = current ? current.quantity + 1 : 1
      return {
        ...prev,
        [product.id]: { product, quantity, notes: current?.notes },
      }
    })
  }

  const handleRemoveItem = (productId: string) => {
    setPreOrderItems((prev) => {
      const current = prev[productId]
      if (!current) return prev
      if (current.quantity <= 1) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return {
        ...prev,
        [productId]: { ...current, quantity: current.quantity - 1 },
      }
    })
  }

  const handleSubmitReservation = async () => {
    setSubmitError(null)

    if (!customerName.trim()) {
      setSubmitError('Por favor ingresa tu nombre completo')
      return
    }
    if (!customerPhone.trim()) {
      setSubmitError('Por favor ingresa tu número de WhatsApp para confirmar tu mesa')
      return
    }

    setSubmitting(true)

    try {
      const combinedDateTime = new Date(`${date}T${time}:00`).toISOString()

      let preOrderPayload: PreOrderData | null = null
      if (preOrderList.length > 0) {
        preOrderPayload = {
          items: preOrderList,
          totalAmount: preOrderTotal,
          paymentStatus: paymentOption,
          paymentMethod: paymentOption === 'PREPAID' ? paymentMethod : undefined,
          prepaidAt: paymentOption === 'PREPAID' ? new Date().toISOString() : undefined,
          customerNote: specialNotes || undefined,
        }
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || null,
          partySize,
          reservationDate: combinedDateTime,
          notes: specialNotes.trim() || null,
          preOrder: preOrderPayload,
          status: 'CONFIRMED',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar tu reserva')
      }

      setConfirmedReservation(data)
      setStep(3)
    } catch (err: any) {
      setSubmitError(err.message || 'Ocurrió un error inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={`/menu/${restaurant.slug}`}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>←</span>
            <span>Volver al Menú</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-black text-white tracking-wide">{restaurant.name}</h1>
            <p className="text-[11px] text-amber-400 font-medium">Reservación en Línea</p>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* ── STEP 1: Datos de Fecha, Comensales y Contacto ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-white">Reserva tu Experiencia</h2>
              <p className="text-xs text-zinc-400">
                Asegura tu mesa en segundos y recibe confirmación al instante por WhatsApp.
              </p>
            </div>

            {/* Número de comensales */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                1. ¿Cuántas personas asistirán?
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPartySize(num)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      partySize === num
                        ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 font-black scale-105'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    👤 {num} {num === 1 ? 'persona' : 'personas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                2. ¿Cuándo nos visitas?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-zinc-400 block mb-1.5 font-medium">Fecha</span>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block mb-1.5 font-medium">Hora de llegada</span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          time === slot
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de contacto */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                3. Datos de Contacto
              </label>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Nombre completo *</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">
                    Número de WhatsApp / Celular * <span className="text-[10px] text-amber-400">(recibirás confirmación inmediata)</span>
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 310 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Correo electrónico (opcional)</span>
                  <input
                    type="email"
                    placeholder="juan@ejemplo.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-zinc-400 block mb-1">Notas especiales o motivo (opcional)</span>
                  <textarea
                    rows={2}
                    placeholder="Ej. Cumpleaños, aniversario, mesa cerca a la ventana..."
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Opciones de navegación */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black py-3.5 rounded-xl text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📦 Pre-ordenar Platillos (Opcional)</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitReservation}
                disabled={submitting}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-6 py-3.5 rounded-xl text-sm transition-all border border-zinc-700 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Confirmando…' : 'Confirmar sin Pre-orden'}
              </button>
            </div>

            {submitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: Pre-orden de Comida (Opcional) ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Pre-ordena tu Menú</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tus platillos comenzarán a prepararse para estar listos justo cuando llegues a la mesa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ← Volver a Datos
              </button>
            </div>

            {/* Categorías */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.name} ({cat.products.length})
                </button>
              ))}
            </div>

            {/* Lista de productos de la categoría activa */}
            <div className="space-y-3">
              {categories
                .find((c) => c.id === activeCategory)
                ?.products.map((prod) => {
                  const qty = preOrderItems[prod.id]?.quantity || 0

                  return (
                    <div
                      key={prod.id}
                      className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-zinc-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{prod.name}</p>
                        {prod.description && (
                          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{prod.description}</p>
                        )}
                        <p className="text-xs font-black text-amber-400 mt-1">
                          ${prod.price.toLocaleString('es-CO')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(prod.id)}
                              className="w-6 h-6 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-white px-1">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleAddItem(prod)}
                              className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddItem(prod)}
                            className="bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 text-xs font-bold px-3.5 py-1.5 rounded-xl border border-zinc-700 transition-all cursor-pointer"
                          >
                            + Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>

            {/* Resumen de Pre-orden y Opción de Pago */}
            {preOrderList.length > 0 && (
              <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>🛒 Resumen de Pre-orden</span>
                      <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {preOrderList.reduce((acc, it) => acc + it.quantity, 0)} platos
                      </span>
                    </h3>
                  </div>
                  <span className="text-base font-black text-amber-400">
                    ${preOrderTotal.toLocaleString('es-CO')}
                  </span>
                </div>

                {/* Modalidad de Pago */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 block">¿Cómo prefieres pagar?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('PREPAID')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentOption === 'PREPAID'
                          ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <p className="text-xs font-black">💳 Pagar por anticipado</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Comida lista y cuenta saldada al llegar</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentOption('UNPAID')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        paymentOption === 'UNPAID'
                          ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <p className="text-xs font-black">⏳ Pagar en el restaurante</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Cancela tu consumo al finalizar tu estancia</p>
                    </button>
                  </div>
                </div>

                {paymentOption === 'PREPAID' && (
                  <div className="bg-zinc-800/60 rounded-xl p-3 flex items-center justify-between text-xs text-zinc-300">
                    <span>Método sugerido:</span>
                    <span className="font-semibold text-amber-400">Tarjeta / Nequi / PSE</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón Finalizar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitReservation}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black py-4 rounded-xl text-base shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{submitting ? 'Confirmando reservación…' : 'Finalizar y Confirmar Reservación'}</span>
                <span>✓</span>
              </button>
            </div>

            {submitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirmación y Ticket Digital ── */}
        {step === 3 && confirmedReservation && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-3xl mx-auto text-emerald-400">
                ✓
              </div>
              <h2 className="text-2xl font-black text-white">¡Reserva Confirmada!</h2>
              <p className="text-xs text-zinc-400">
                Hemos enviado un mensaje de confirmación a tu WhatsApp (+{confirmedReservation.customerPhone}).
              </p>
            </div>

            {/* Ticket Digital */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500" />

              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">iMenu Ticket</p>
                  <p className="text-base font-black text-white">{restaurant.name}</p>
                </div>
                <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                  CONFIRMADA
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Titular:</span>
                  <span className="font-bold text-white">{confirmedReservation.customerName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Comensales:</span>
                  <span className="font-bold text-white">{confirmedReservation.partySize} personas</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Fecha y Hora:</span>
                  <span className="font-bold text-amber-400">
                    {new Date(confirmedReservation.reservationDate).toLocaleString('es-CO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Contacto:</span>
                  <span className="font-mono text-zinc-300">+{confirmedReservation.customerPhone}</span>
                </div>
              </div>

              {/* Pre-orden si existe */}
              {confirmedReservation.preOrder && confirmedReservation.preOrder.items?.length > 0 && (
                <div className="bg-zinc-950/80 rounded-2xl p-4 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-zinc-800 pb-2">
                    <span className="text-amber-400">📦 Pre-orden de Alimentos</span>
                    <span>${confirmedReservation.preOrder.totalAmount?.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    {confirmedReservation.preOrder.items.map((it: PreOrderItem, idx: number) => (
                      <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                        <span>{it.quantity}x {it.name}</span>
                        <span className="font-mono">${it.subtotal.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 text-[11px] text-zinc-500 flex justify-between">
                    <span>Estado del pago:</span>
                    <span className="font-bold text-zinc-300">
                      {confirmedReservation.preOrder.paymentStatus === 'PREPAID' ? '✅ Pagado por anticipado' : '⏳ Pago en restaurante'}
                    </span>
                  </div>
                </div>
              )}

              {restaurant.address && (
                <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{restaurant.address}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${confirmedReservation.customerPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
              >
                <span>💬 Abrir confirmación en WhatsApp</span>
              </a>

              <Link
                href={`/menu/${restaurant.slug}`}
                className="block text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Volver a la carta del restaurante
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
