import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TablesGrid } from './TablesGrid'
import { type EnrichedTable } from '@/components/tables/FloorPlanVisualizer'

export const metadata: Metadata = {
  title: 'Mesas y Plano — iMenu Dashboard',
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

  const tablesRaw = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: 'asc' },
    select: {
      id: true,
      tableNumber: true,
      zone: true,
      status: true,
      capacity: true,
      posX: true,
      posY: true,
      width: true,
      height: true,
      shape: true,
      restaurantId: true,
      sessions: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          sessionToken: true,
          createdAt: true,
          status: true,
        },
      },
      reservations: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          reservationDate: { gte: new Date(Date.now() - 3600000) },
        },
        orderBy: { reservationDate: 'asc' },
        take: 1,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          partySize: true,
          reservationDate: true,
          status: true,
        },
      },
    },
  })

  const now = Date.now()
  const tables: EnrichedTable[] = tablesRaw.map((t) => {
    const activeSession = t.sessions[0] || null
    const elapsedMinutes = activeSession
      ? Math.floor((now - new Date(activeSession.createdAt).getTime()) / 60000)
      : null
    const nextReservation = t.reservations[0]
      ? {
          ...t.reservations[0],
          reservationDate: t.reservations[0].reservationDate.toISOString(),
        }
      : null

    return {
      id: t.id,
      restaurantId: t.restaurantId,
      tableNumber: t.tableNumber,
      zone: t.zone,
      status: t.status,
      capacity: t.capacity,
      posX: t.posX,
      posY: t.posY,
      width: t.width,
      height: t.height,
      shape: t.shape,
      activeSession: activeSession
        ? {
            ...activeSession,
            createdAt: activeSession.createdAt.toISOString(),
          }
        : null,
      elapsedMinutes,
      nextReservation,
    }
  })

  // Métricas globales
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0)
  const occupiedCapacity = tables
    .filter((t) => t.status === 'ACTIVE_QR_SESSION' || t.status === 'TRADITIONAL_SERVICE')
    .reduce((sum, t) => sum + t.capacity, 0)
  const occupancyPercent =
    totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0
  const overtimeCount = tables.filter(
    (t) => t.status === 'ACTIVE_QR_SESSION' && (t.elapsedMinutes ?? 0) >= 90
  ).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Mesas &amp; Salón</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Plano interactivo, estado en tiempo real, rotación y reservaciones.
        </p>
      </div>

      {/* Interactive views */}
      <TablesGrid
        restaurantId={restaurantId}
        tables={tables}
        totalCapacity={totalCapacity}
        occupiedCapacity={occupiedCapacity}
        occupancyPercent={occupancyPercent}
        overtimeCount={overtimeCount}
      />
    </div>
  )
}

