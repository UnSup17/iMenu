'use client'

import { ServiceChannelData } from '@/lib/analytics/engine'

interface ServiceChannelBreakdownProps {
  channels: ServiceChannelData[]
}

const CHANNEL_ICONS = {
  DINE_IN: '🍽️',
  BAR: '🍸',
  DELIVERY: '🛵',
}

const CHANNEL_COLORS = {
  DINE_IN: 'bg-amber-500',
  BAR: 'bg-emerald-500',
  DELIVERY: 'bg-blue-500',
}

const CHANNEL_TEXT_COLORS = {
  DINE_IN: 'text-amber-400',
  BAR: 'text-emerald-400',
  DELIVERY: 'text-blue-400',
}

export function ServiceChannelBreakdown({ channels }: ServiceChannelBreakdownProps) {
  if (!channels || channels.length === 0) return null

  const totalSales = channels.reduce((s, c) => s + c.revenue, 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="border-b border-zinc-800/80 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🛵</span> Segmentación de Ventas por Tipo de Servicio
        </h3>
        <p className="text-xs text-zinc-400">
          Distribución de facturación entre Salón/Mesa (QR/Presencial), Barra y Delivery
        </p>
      </div>

      {/* Segmented Bar */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-zinc-950 overflow-hidden flex p-0.5 border border-zinc-800">
          {channels.map((ch) => {
            if (ch.percentage <= 0) return null
            return (
              <div
                key={ch.channel}
                style={{ width: `${ch.percentage}%` }}
                className={`h-full ${CHANNEL_COLORS[ch.channel]} first:rounded-l-full last:rounded-r-full transition-all duration-300`}
                title={`${ch.label}: ${ch.percentage}%`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-[11px] text-zinc-400 font-medium px-1">
          {channels.map((ch) => (
            <span key={ch.channel} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${CHANNEL_COLORS[ch.channel]}`} />
              <span>{ch.channel === 'DINE_IN' ? 'Salón' : ch.channel === 'BAR' ? 'Barra' : 'Delivery'}</span>
              <span className="font-mono font-bold text-white">({ch.percentage}%)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Cards por canal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {channels.map((ch) => (
          <div
            key={ch.channel}
            className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CHANNEL_ICONS[ch.channel]}</span>
                <h4 className="font-semibold text-xs text-white">{ch.label}</h4>
              </div>
              <span className={`text-xs font-bold font-mono ${CHANNEL_TEXT_COLORS[ch.channel]}`}>
                {ch.percentage}%
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] block">Total Ventas:</span>
                <span className="font-bold text-white">${ch.revenue.toLocaleString('es-CO')}</span>
              </div>
              <div className="text-right">
                <span className="text-zinc-500 text-[10px] block">Ticket Promedio:</span>
                <span className="text-zinc-300 font-semibold">
                  ${ch.averageTicket.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 font-mono">
              {ch.invoicesCount} comandas procesadas
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
