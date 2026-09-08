import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InventoryItemForm } from '@/components/inventory/item-form'
import { StockAdjustmentForm } from '@/components/inventory/stock-adjustment-form'

export const metadata = { title: 'Editar Ítem de Inventario — iMenu' }

export default async function EditInventoryItemPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.id, restaurantId: user.restaurantId },
    include: {
      movements: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!item) redirect('/dashboard/inventory')

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">✏️ Editar {item.name}</h1>
        <p className="text-sm text-zinc-400">
          Stock actual:{' '}
          <span className="font-mono font-bold text-amber-400">
            {item.currentStock.toNumber().toFixed(3)} {item.unit}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Datos del Ítem</h2>
          <InventoryItemForm
            initialData={{
              id: item.id,
              name: item.name,
              sku: item.sku,
              unit: item.unit,
              minStock: item.minStock.toNumber(),
              costPerUnit: item.costPerUnit ? item.costPerUnit.toNumber() : null,
            }}
          />
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Ajuste Manual / Merma</h2>
            <StockAdjustmentForm itemId={item.id} unit={item.unit} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Últimos Movimientos</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 text-xs">
              {item.movements.length === 0 ? (
                <p className="p-4 text-zinc-500 text-center">No hay movimientos registrados</p>
              ) : (
                item.movements.map((m) => (
                  <div key={m.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-white">{m.type}</p>
                      <p className="text-zinc-500 text-[11px]">{m.notes ?? 'Sin motivo'}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono font-semibold ${
                          m.quantity.toNumber() >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {m.quantity.toNumber() > 0 ? '+' : ''}
                        {m.quantity.toNumber().toFixed(3)} {item.unit}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {new Date(m.createdAt).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
