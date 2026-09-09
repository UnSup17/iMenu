'use client'

import { useState } from 'react'

interface Table {
  id: string
  tableNumber: number
  zone: string | null
  status: string
  restaurantId?: string | null
  foodCourtId?: string | null
}

interface SessionResult {
  menuUrl: string
  qrCodeDataUrl: string
  expiresAt: string
  tableNumber: number
}

const statusLabel: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE: {
    label: 'Disponible',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  ACTIVE_QR_SESSION: {
    label: 'En servicio (QR)',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400 animate-pulse',
  },
  TRADITIONAL_SERVICE: {
    label: 'Servicio tradicional',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
  },
  MAINTENANCE: {
    label: 'Mantenimiento',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-400',
  },
}

function TableCard({ table }: { table: Table }) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)
  const [status, setStatus] = useState(table.status)

  const s = statusLabel[status] ?? statusLabel.AVAILABLE

  async function openSession() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tables/${table.id}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: table.restaurantId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al crear sesión')
      }
      const data: SessionResult = await res.json()
      setSession(data)
      setStatus('ACTIVE_QR_SESSION')
      setShowQr(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function copyUrl() {
    if (session?.menuUrl) {
      navigator.clipboard.writeText(session.menuUrl)
    }
  }

  return (
    <>
      <div
        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4
                   transition-colors space-y-3 cursor-pointer"
        onClick={() => {
          if (session) setShowQr(true)
          else openSession()
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-white text-lg leading-none">Mesa {table.tableNumber}</p>
            {table.zone && <p className="text-xs text-zinc-500 mt-0.5">{table.zone}</p>}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                           px-2.5 py-1 rounded-full border ${s.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); openSession() }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold
                     bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20
                     px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> Creando sesión...</>
          ) : (
            <>{session ? '🔄 Nueva sesión QR' : '📱 Iniciar sesión QR'}</>
          )}
        </button>

        {session && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowQr(true) }}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold
                       bg-zinc-800 hover:bg-zinc-700 text-zinc-300
                       px-3 py-2 rounded-lg transition-all"
          >
            📋 Ver QR activo
          </button>
        )}
      </div>

      {/* QR Modal */}
      {showQr && session && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Mesa {session.tableNumber}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Expira: {new Date(session.expiresAt).toLocaleTimeString('es-MX', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowQr(false)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center bg-white rounded-xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>

            {/* Menu URL */}
            <div className="bg-zinc-800 rounded-xl p-3 space-y-2">
              <p className="text-xs text-zinc-400 font-semibold">URL del menú:</p>
              <p className="text-xs text-zinc-300 break-all font-mono leading-relaxed">
                {session.menuUrl}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyUrl}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold
                           bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl transition-all"
              >
                📋 Copiar URL
              </button>
              <a
                href={session.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold
                           bg-amber-500 hover:bg-amber-400 text-zinc-950 px-4 py-2.5 rounded-xl transition-all"
              >
                🔗 Abrir menú
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function TablesGrid({ tables }: { tables: Table[] }) {
  const byZone = tables.reduce<Record<string, Table[]>>((acc, table) => {
    const zone = table.zone ?? 'Sin zona'
    if (!acc[zone]) acc[zone] = []
    acc[zone].push(table)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(byZone).map(([zone, zoneTables]) => (
        <section key={zone}>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded-full" />
            {zone}
            <span className="text-zinc-600 font-normal normal-case tracking-normal">
              ({zoneTables.length} mesas)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {zoneTables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        </section>
      ))}
      {tables.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-4xl mb-3">🪑</p>
          <p className="text-sm">No hay mesas configuradas aún.</p>
        </div>
      )}
    </div>
  )
}
