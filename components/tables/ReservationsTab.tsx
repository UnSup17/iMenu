'use client'

import { useState, useEffect } from 'react'
import { type EnrichedTable } from './FloorPlanVisualizer'

export interface ReservationItem {
  id: string
  restaurantId: string
  tableId: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string
  partySize: number
  reservationDate: string
  status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  notes: string | null
  seatedAt: string | null
  createdAt: string
  table?: {
    id: string
    tableNumber: number
    zone: string | null
    capacity: number
    status: string
  } | null
}

interface ReservationsTabProps {
  restaurantId: string
  tables: EnrichedTable[]
  onReservationSeated?: (tableId: string) => void
}

export function ReservationsTab({
  restaurantId,
  tables,
  onReservationSeated,
}: ReservationsTabProps) {
  const [reservations, setReservations] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Formulario de nueva reserva
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [partySize, setPartySize] = useState<number>(2)
  const [dateTime, setDateTime] = useState<string>(() => {
    const d = new Date()
    d.setHours(d.getHours() + 2, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchReservations = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = filterDate
        ? `/api/reservations?restaurantId=${restaurantId}&date=${filterDate}`
        : `/api/reservations?restaurantId=${restaurantId}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar reservas')
      }
      const data = await res.json()
      setReservations(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (restaurantId) {
      fetchReservations()
    }
  }, [restaurantId, filterDate])

  // Filtrado local por status
  const displayedReservations =
    filterStatus === 'ALL'
      ? reservations
      : reservations.filter((r) => r.status === filterStatus)

  // Acciones sobre una reserva
  const handleUpdateStatus = async (
    id: string,
    newStatus: ReservationItem['status'],
    tableId?: string | null
  ) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar reserva')
      }
      const updated = await res.json()
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)))

      if (newStatus === 'SEATED' && tableId) {
        onReservationSeated?.(tableId)
      }
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta reservación?')) return
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setReservations((prev) => prev.filter((r) => r.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    try {
      const payload = {
        restaurantId,
        customerName,
        customerPhone,
        customerEmail: customerEmail.trim() || null,
        partySize,
        reservationDate: new Date(dateTime).toISOString(),
        tableId: selectedTableId || null,
        notes: notes.trim() || null,
        status: 'CONFIRMED',
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar reservación')
      }

      setReservations((prev) => [data, ...prev])
      setIsModalOpen(false)

      // Reset form
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setPartySize(2)
      setSelectedTableId('')
      setNotes('')
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Métricas
  const totalGuests = reservations.reduce((sum, r) => sum + r.partySize, 0)
  const confirmedCount = reservations.filter((r) => r.status === 'CONFIRMED').length
  const seatedCount = reservations.filter((r) => r.status === 'SEATED').length

  return (
    <div className="space-y-6">
      {/* KPI Cards de Reservas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <span className="text-xs text-zinc-400 font-semibold">Total Reservas</span>
          </div>
          <p className="text-2xl font-bold text-white">{reservations.length}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-zinc-400 font-semibold">Confirmadas</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{confirmedCount}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-xs text-zinc-400 font-semibold">Sentadas / En Mesa</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{seatedCount}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">👥</span>
            <span className="text-xs text-zinc-400 font-semibold">Comensales Esperados</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{totalGuests}</p>
        </div>
      </div>

      {/* Controles de filtro y botón crear */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Fecha */}
          <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-700">
            <span className="text-xs text-zinc-400">Fecha:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setFilterDate(today)
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
          >
            Hoy
          </button>

          <button
            onClick={() => {
              const tmrw = new Date()
              tmrw.setDate(tmrw.getDate() + 1)
              setFilterDate(tmrw.toISOString().split('T')[0])
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
          >
            Mañana
          </button>

          <button
            onClick={() => setFilterDate('')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer"
          >
            Ver todas
          </button>
        </div>

        {/* Botón Nueva Reservación */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
        >
          <span>+</span>
          <span>Nueva Reservación</span>
        </button>
      </div>

      {/* Selector de estado */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'Todas' },
          { key: 'PENDING', label: 'Pendientes' },
          { key: 'CONFIRMED', label: 'Confirmadas' },
          { key: 'SEATED', label: 'Sentadas' },
          { key: 'COMPLETED', label: 'Finalizadas' },
          { key: 'CANCELLED', label: 'Canceladas' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filterStatus === key
                ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de Reservaciones */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          <span className="animate-spin inline-block mr-2">⟳</span> Cargando agenda de reservaciones...
        </div>
      ) : displayedReservations.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/80 rounded-3xl space-y-2">
          <span className="text-3xl">📅</span>
          <p className="text-sm font-semibold text-zinc-300">No hay reservaciones para esta fecha o estado.</p>
          <p className="text-xs text-zinc-500">Crea una nueva reservación con el botón superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedReservations.map((res) => {
            const timeStr = new Date(res.reservationDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            const dateStr = new Date(res.reservationDate).toLocaleDateString([], {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })

            const statusColors = {
              PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              CONFIRMED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              SEATED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
              COMPLETED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
              CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
              NO_SHOW: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            }[res.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'

            return (
              <div
                key={res.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {res.customerName}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      📞 {res.customerPhone} {res.customerEmail && `• ${res.customerEmail}`}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusColors}`}>
                    {res.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Fecha y Hora</span>
                    <span className="font-bold text-white">
                      {dateStr} • {timeStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Personas</span>
                    <span className="font-bold text-amber-400">
                      👥 {res.partySize} personas
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500 text-[10px]">Mesa asignada:</span>
                    {res.table ? (
                      <span className="font-bold text-zinc-200">
                        🪑 Mesa {res.table.tableNumber} ({res.table.zone || 'General'}, Cap: {res.table.capacity})
                      </span>
                    ) : (
                      <span className="text-amber-400/80 font-medium">⚠️ Sin mesa fija</span>
                    )}
                  </div>
                </div>

                {res.notes && (
                  <p className="text-xs text-zinc-400 bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-800 italic">
                    &quot;{res.notes}&quot;
                  </p>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                  {res.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'CONFIRMED')}
                      className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ✓ Confirmar
                    </button>
                  )}

                  {(res.status === 'CONFIRMED' || res.status === 'PENDING') && (
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'SEATED', res.tableId)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2 rounded-xl text-xs font-black shadow-md shadow-amber-500/10 transition-all cursor-pointer"
                    >
                      🪑 Sentar Comensal
                    </button>
                  )}

                  {res.status === 'SEATED' && (
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'COMPLETED')}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ✓ Finalizar
                    </button>
                  )}

                  {res.status !== 'CANCELLED' && res.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateStatus(res.id, 'CANCELLED')}
                      className="px-3 py-2 bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Cancelar reserva"
                    >
                      ✕
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(res.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nueva Reservación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>📅</span>
                <span>Nueva Reservación</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                {formError}
              </p>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Nombre del Comensal *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  placeholder="Ej: Sofia Mendoza"
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    placeholder="+57 300..."
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-zinc-300">Personas *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Email (opcional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  placeholder="correo@ejemplo.com"
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 flex items-center justify-between">
                  <span>Asignar Mesa</span>
                  <span className="text-[10px] text-zinc-400">Sugerida según capacidad</span>
                </label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Sin mesa asignada (asignar al llegar) --</option>
                  {tables.map((t) => {
                    const isAdequate = t.capacity >= partySize
                    return (
                      <option key={t.id} value={t.id}>
                        Mesa {t.tableNumber} — {t.zone || 'General'} (Cap: {t.capacity} pers)
                        {!isAdequate ? ' ⚠️ Capacidad menor' : ' ✓ Recomendada'}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-300">Notas / Peticiones especiales</label>
                <textarea
                  rows={2}
                  value={notes}
                  placeholder="Ej: Aniversario, mesa tranquila, silla de bebé..."
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2.5 rounded-xl font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
