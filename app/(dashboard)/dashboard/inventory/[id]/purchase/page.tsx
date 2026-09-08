import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StockPurchaseForm } from '@/components/inventory/stock-purchase-form'

export const metadata = { title: 'Registrar Compra de Insumos — iMenu' }

export default async function PurchaseInventoryPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.id, restaurantId: user.restaurantId },
  })

  if (!item) redirect('/dashboard/inventory')

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">🛒 Entradas de Stock / Compras</h1>
        <p className="text-sm text-zinc-400">
          Registra una compra o reposición para{' '}
          <strong className="text-amber-400">{item.name}</strong>.
        </p>
      </div>

      <StockPurchaseForm item={{ id: item.id, name: item.name, unit: item.unit }} />
    </div>
  )
}
