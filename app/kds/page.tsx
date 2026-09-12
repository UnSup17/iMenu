import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { KdsViewClient, type KdsOrder } from '@/components/kitchen/KdsViewClient'

export const metadata: Metadata = {
  title: 'KDS Fullscreen — Cocina — iMenu',
  description: 'Sistema de visualización de comandas en tiempo real para cocina (Modo Tablet Fullscreen).',
}

export default async function KdsTabletPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const restaurantId = (session.user as { restaurantId?: string }).restaurantId

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-500 text-sm">
        No tienes un restaurante asignado.
      </div>
    )
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true },
  })

  // Cargar órdenes activas de cocina (RECEIVED, PREPARING, READY)
  const ordersRaw = await prisma.order.findMany({
    where: {
      restaurantId,
      status: { in: ['RECEIVED', 'PREPARING', 'READY'] },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      table: {
        select: {
          tableNumber: true,
          zone: true,
          assignedWaiter: { select: { name: true } },
        },
      },
      items: {
        include: {
          product: { select: { name: true } },
          modifiers: { include: { modifierOption: true } },
          additions: { include: { addition: true } },
        },
      },
    },
  })

  const initialOrders: KdsOrder[] = ordersRaw.map((o) => ({
    id: o.id,
    tableId: o.tableId,
    tableNumber: o.table.tableNumber,
    zone: o.table.zone,
    waiterName: o.table.assignedWaiter?.name || null,
    status: o.status,
    priority: (o.priority as 'NORMAL' | 'URGENT') || 'NORMAL',
    totalAmount: o.totalAmount.toNumber(),
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    preparedAt: o.preparedAt ? o.preparedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toNumber(),
      subtotal: i.subtotal.toNumber(),
      itemNotes: i.itemNotes,
      isPrepared: Boolean(i.isPrepared),
      modifiers: i.modifiers.map((m) => m.modifierOption.name),
      additions: i.additions.map((a) => ({
        id: a.additionId,
        name: a.addition.name,
        quantity: a.quantity,
        price: a.priceCharged.toNumber(),
      })),
    })),
  }))

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950">
      <KdsViewClient
        restaurantId={restaurantId}
        restaurantName={restaurant?.name || 'Restaurante'}
        initialOrders={initialOrders}
        fullscreenMode={true}
      />
    </div>
  )
}
