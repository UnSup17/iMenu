import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Facturación y Caja — iMenu' }

export default async function BillingHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAITER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const restaurantId = user.restaurantId!

  // Fetch today's sales summary
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [invoicesToday, openTables, taxConfig] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        restaurantId,
        issuedAt: { gte: todayStart },
        status: { in: ['ISSUED', 'PAID'] },
      },
      include: {
        payments: true,
      },
    }),
    prisma.tableSession.findMany({
      where: {
        table: { restaurantId },
        closedAt: null,
      },
      include: {
        table: true,
        orders: {
          where: { status: { in: ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'] } },
        },
      },
    }),
    prisma.taxConfig.findUnique({
      where: { restaurantId },
    }),
  ])

  const totalBilledToday = invoicesToday.reduce((acc, inv) => acc + inv.total.toNumber(), 0)
  const totalTaxToday = invoicesToday.reduce((acc, inv) => acc + inv.taxAmount.toNumber(), 0)
  const paidInvoicesCount = invoicesToday.filter((i) => i.status === 'PAID').length
  const pendingInvoicesCount = invoicesToday.filter((i) => i.status === 'ISSUED').length

  const vatRatePercentage = taxConfig?.vatRate ? taxConfig.vatRate.toNumber() * 100 : 19

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 Facturación y Ventas del Día</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Resumen de ingresos, emisión de comprobantes y cierre de mesas en tiempo real.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/billing/invoices"
            className="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-800 transition-colors"
          >
            📋 Facturas Emitidas
          </Link>
          <Link
            href="/dashboard/billing/config"
            className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            ⚙️ Configuración Fiscal
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Ventas Brutas del Día</p>
          <p className="text-3xl font-bold text-emerald-400 font-mono">
            ${totalBilledToday.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-zinc-500 mt-2">{invoicesToday.length} facturas generadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Impuestos Recaudados (IVA)</p>
          <p className="text-3xl font-bold text-white font-mono">
            ${totalTaxToday.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Tarifa: {vatRatePercentage}% ({taxConfig?.country ?? 'CO'})
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Facturas Pagadas</p>
          <p className="text-3xl font-bold text-blue-400 font-mono">{paidInvoicesCount}</p>
          <p className="text-xs text-zinc-500 mt-2">Cobradas satisfactoriamente</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pendientes de Cobro</p>
          <p className={`text-3xl font-bold font-mono ${pendingInvoicesCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
            {pendingInvoicesCount}
          </p>
          <p className="text-xs text-zinc-500 mt-2">Emitidas sin registrar pago total</p>
        </div>
      </div>

      {/* Quick Table Closure Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">🍽️ Mesas Abiertas con Consumo (Listo para Facturar)</h2>
        {openTables.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            No hay mesas abiertas con consumos activos en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {openTables.map((sessionItem) => {
              const orderTotal = sessionItem.orders.reduce(
                (acc, o) => acc + o.totalAmount.toNumber(),
                0,
              )

              return (
                <div
                  key={sessionItem.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">Mesa {sessionItem.table.tableNumber}</h3>
                      <p className="text-xs text-zinc-500">{sessionItem.orders.length} órdenes activas</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-900 text-amber-400">
                      Ocupada
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-zinc-800/80 pt-3">
                    <span className="text-xs text-zinc-400">Total Consumido:</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      ${orderTotal.toLocaleString('es-CO')}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/billing/close-table/${sessionItem.table.id}`}
                    className="block w-full text-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors"
                  >
                    💳 Facturar y Cerrar Mesa
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
