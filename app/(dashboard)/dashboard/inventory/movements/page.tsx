import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Historial de Movimientos de Inventario — iMenu' }

export default async function InventoryMovementsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const restaurantId = user.restaurantId!

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      inventoryItem: { restaurantId },
    },
    include: {
      inventoryItem: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">📜 Historial de Movimientos</h1>
        <p className="text-sm text-zinc-400">
          Registro auditor de entradas, salidas, ventas, mermas y ajustes manuales en inventario.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              {['Fecha y Hora', 'Ingrediente', 'Tipo de Movimiento', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Usuario / Motivo'].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  No hay movimientos registrados en el sistema.
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const isPositive = m.quantity.toNumber() > 0
                const isSale = m.type === 'SALE'
                const isWaste = m.type === 'WASTE'
                const isPurchase = m.type === 'PURCHASE'

                const typeBadge = isSale
                  ? 'bg-blue-950/60 text-blue-400 border border-blue-900/50'
                  : isWaste
                  ? 'bg-red-950/60 text-red-400 border border-red-900/50'
                  : isPurchase
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                  : 'bg-zinc-800 text-zinc-300'

                return (
                  <tr key={m.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                      {new Date(m.createdAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{m.inventoryItem.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${typeBadge}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {m.quantity.toNumber().toFixed(3)} {m.inventoryItem.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                      {m.stockBefore.toNumber().toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs font-semibold">
                      {m.stockAfter.toNumber().toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      <div>{m.createdBy?.name ?? m.createdBy?.email ?? 'Sistema (Auto)'}</div>
                      {m.notes && <div className="text-zinc-500 text-[11px] font-mono">{m.notes}</div>}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
