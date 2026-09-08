import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Inventario — iMenu' }

export default async function InventoryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sessionUser = session.user as { id?: string; restaurantId?: string; role?: string }
  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(sessionUser.role || '')) redirect('/dashboard')

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id! },
    select: { restaurantId: true, organizationId: true },
  })

  let restaurantId = user?.restaurantId
  if (!restaurantId && user?.organizationId) {
    const firstBranch = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    restaurantId = firstBranch?.id ?? null
  }
  if (!restaurantId && sessionUser.role === 'SUPERADMIN') {
    const firstRest = await prisma.restaurant.findFirst({ select: { id: true } })
    restaurantId = firstRest?.id ?? null
  }

  if (!restaurantId) redirect('/dashboard')

  const items = await prisma.inventoryItem.findMany({
    where: { restaurantId, isActive: true },
    include: { _count: { select: { productRecipes: true } } },
    orderBy: { name: 'asc' },
  })

  const stats = {
    total: items.length,
    empty: items.filter((i) => i.currentStock.toNumber() <= 0).length,
    low: items.filter(
      (i) => i.currentStock.toNumber() > 0 && i.currentStock.toNumber() <= i.minStock.toNumber(),
    ).length,
    ok: items.filter((i) => i.currentStock.toNumber() > i.minStock.toNumber()).length,
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 Inventario</h1>
          <p className="text-sm text-zinc-500 mt-1">Materias primas e ingredientes de tu restaurante</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/inventory/movements"
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            📊 Movimientos
          </Link>
          <Link
            href="/dashboard/inventory/new"
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
          >
            + Nuevo ítem
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total ítems', value: stats.total, color: 'text-zinc-300', bg: 'bg-zinc-800/50' },
          { label: 'Sin stock', value: stats.empty, color: 'text-red-400', bg: 'bg-red-950/30 border border-red-900/40' },
          { label: 'Stock bajo', value: stats.low, color: 'text-amber-400', bg: 'bg-amber-950/30 border border-amber-900/40' },
          { label: 'Stock OK', value: stats.ok, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border border-emerald-900/40' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${stat.bg}`}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg font-medium text-zinc-400">No hay ítems de inventario</p>
          <p className="text-sm mt-2">Agrega ingredientes y luego asígnalos a tus productos con recetas</p>
          <Link
            href="/dashboard/inventory/new"
            className="mt-6 inline-block px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            + Agregar primer ítem
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                {['Ingrediente', 'SKU', 'Unidad', 'Stock actual', 'Mín.', 'Estado', 'Recetas', 'Acciones'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {items.map((item) => {
                const stock = item.currentStock.toNumber()
                const min = item.minStock.toNumber()
                const isEmpty = stock <= 0
                const isLow = stock > 0 && stock <= min
                const statusColor = isEmpty ? 'text-red-400 bg-red-950/40' : isLow ? 'text-amber-400 bg-amber-950/40' : 'text-emerald-400 bg-emerald-950/40'
                const statusLabel = isEmpty ? 'Sin stock' : isLow ? 'Stock bajo' : 'OK'

                return (
                  <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                    <td className="px-4 py-3 text-zinc-500">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-semibold ${isEmpty ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'}`}>
                        {stock.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono">{min.toFixed(3)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{item._count.productRecipes} prod.</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/inventory/${item.id}`}
                          className="text-xs text-amber-500 hover:text-amber-400 font-medium"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/dashboard/inventory/${item.id}/purchase`}
                          className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                        >
                          + Compra
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
