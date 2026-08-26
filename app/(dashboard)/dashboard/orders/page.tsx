import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { OrdersPageClient } from './OrdersPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pedidos — iMenu Dashboard',
}

export default async function OrdersPage() {
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

  // Cargar últimas 50 órdenes del día de hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const recentOrders = await prisma.order.findMany({
    where: {
      restaurantId,
      createdAt: { gte: today },
      status: { in: ['RECEIVED', 'PREPARING'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      table: { select: { tableNumber: true } },
      items: true,
    },
  })

  const initialOrders = recentOrders.map((order) => ({
    orderId: order.id,
    restaurantId: order.restaurantId,
    tableId: order.tableId,
    tableNumber: order.table.tableNumber,
    totalAmount: order.totalAmount.toNumber(),
    itemsCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: order.createdAt.toISOString(),
  }))

  return (
    <OrdersPageClient
      restaurantId={restaurantId}
      initialOrders={initialOrders}
    />
  )
}
