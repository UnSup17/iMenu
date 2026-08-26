import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TablesGrid } from './TablesGrid'

export const metadata: Metadata = {
  title: 'Mesas — iMenu Dashboard',
}

const statusLabel: Record<string, { label: string; dot: string }> = {
  AVAILABLE:           { label: 'Disponible',           dot: 'bg-emerald-400' },
  ACTIVE_QR_SESSION:   { label: 'En servicio (QR)',     dot: 'bg-amber-400 animate-pulse' },
  TRADITIONAL_SERVICE: { label: 'Servicio tradicional', dot: 'bg-blue-400' },
  MAINTENANCE:         { label: 'Mantenimiento',        dot: 'bg-red-400' },
}

export default async function TablesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const restaurantId = (session.user as { restaurantId?: string }).restaurantId

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No tienes un restaurante asignado.
      </div>
    )
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: 'asc' },
    select: {
      id: true,
      tableNumber: true,
      zone: true,
      status: true,
      restaurantId: true,
    },
  })

  const totalActive = tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Mesas</h1>
        <p className="text-xs text-zinc-500 mt-0.5">{tables.length} mesas · {totalActive} en servicio activo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(statusLabel).map(([key, { label, dot }]) => {
          const count = tables.filter((t) => t.status === key).length
          return (
            <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Interactive grid */}
      <TablesGrid tables={tables} />
    </div>
  )
}
