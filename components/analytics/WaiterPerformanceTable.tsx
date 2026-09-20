'use client'

import { WaiterPerformanceItem } from '@/lib/analytics/engine'

interface WaiterPerformanceTableProps {
  waiters: WaiterPerformanceItem[]
}

export function WaiterPerformanceTable({ waiters }: WaiterPerformanceTableProps) {
  if (!waiters || waiters.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 space-y-2">
        <span className="text-3xl">👨‍🍳</span>
        <p className="text-xs">No hay pedidos asociados a meseros en el período seleccionado.</p>
      </div>
    )
  }

  const top3 = waiters.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  const medalColors = [
    'border-amber-500/60 bg-amber-500/10 text-amber-300 shadow-amber-500/10',
    'border-zinc-400/60 bg-zinc-400/10 text-zinc-200 shadow-zinc-400/10',
    'border-amber-700/60 bg-amber-700/10 text-amber-500 shadow-amber-700/10',
  ]

  const totalWaiterSales = waiters.reduce((s, w) => s + w.totalSales, 0)
  const totalTips = waiters.reduce((s, w) => s + w.serviceChargeCollected, 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>👨‍🍳</span> Rendimiento del Equipo de Sala (Meseros)
          </h3>
          <p className="text-xs text-zinc-400">
            Ventas totales generadas, ticket promedio de atención y recaudación de servicio por colaborador
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 mr-1">Propinas/Servicio Total:</span>
            <span className="text-emerald-400 font-bold">${totalTips.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Podio Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top3.map((w, idx) => (
          <div
            key={w.waiterId}
            className={`p-4 rounded-2xl border ${medalColors[idx]} shadow-lg space-y-2 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{medals[idx]}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                Puesto #{idx + 1}
              </span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-white truncate">{w.name}</h4>
              <p className="text-[11px] text-zinc-400 truncate">{w.email || 'Personal de Sala'}</p>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] block">Ventas:</span>
                <span className="font-bold text-white">${w.totalSales.toLocaleString('es-CO')}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 text-[10px] block">Ticket Promedio:</span>
                <span className="font-bold text-amber-400">${w.averageTicket.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla completa de meseros */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
              <th className="py-2.5 px-3">Posición / Colaborador</th>
              <th className="py-2.5 px-3 text-right">Mesas / Cuentas</th>
              <th className="py-2.5 px-3 text-right">Ventas Totales</th>
              <th className="py-2.5 px-3 text-right">% del Salón</th>
              <th className="py-2.5 px-3 text-right">Ticket Promedio</th>
              <th className="py-2.5 px-3 text-right">Servicio / Propinas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {waiters.map((w, idx) => {
              const pctOfTotal = totalWaiterSales > 0 ? (w.totalSales / totalWaiterSales) * 100 : 0
              return (
                <tr key={w.waiterId} className="hover:bg-zinc-800/30 transition">
                  <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                    <span className="w-5 text-center text-zinc-500 font-mono text-[11px]">
                      {idx < 3 ? medals[idx] : `#${idx + 1}`}
                    </span>
                    <div>
                      <p className="font-semibold">{w.name}</p>
                      {w.email && <p className="text-[10px] text-zinc-500 font-mono">{w.email}</p>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{w.invoicesCount}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                    ${w.totalSales.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">
                    <span className="text-[11px] font-semibold">{pctOfTotal.toFixed(1)}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white">
                    ${w.averageTicket.toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                    ${w.serviceChargeCollected.toLocaleString('es-CO')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
