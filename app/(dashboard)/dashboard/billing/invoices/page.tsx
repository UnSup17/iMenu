import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { InvoiceStatus } from '@prisma/client'

export const metadata = { title: 'Facturas Emitidas — iMenu' }

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const restaurantId = user.restaurantId!
  const statusFilter = searchParams?.status

  const whereCondition: {
    restaurantId: string
    status?: InvoiceStatus
  } = { restaurantId }

  if (statusFilter && ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'].includes(statusFilter)) {
    whereCondition.status = statusFilter as InvoiceStatus
  }

  const invoices = await prisma.invoice.findMany({
    where: whereCondition,
    include: {
      table: true,
      payments: true,
      _count: { select: { items: true } },
    },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">🧾 Historial de Facturas y Comprobantes</h1>
          <p className="text-sm text-zinc-400">
            Registro de comprobantes generados, estado de pagos e impuestos aplicados.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        {[
          { label: 'Todas', value: '' },
          { label: 'Emitidas (Pendientes)', value: 'ISSUED' },
          { label: 'Pagadas', value: 'PAID' },
          { label: 'Anuladas', value: 'VOID' },
        ].map((tab) => {
          const isActive = (statusFilter ?? '') === tab.value
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/dashboard/billing/invoices?status=${tab.value}` : '/dashboard/billing/invoices'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isActive
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              {['Folio / N°', 'Fecha', 'Mesa / Cliente', 'Subtotal', 'Impuesto (IVA)', 'Total', 'Estado', 'Acciones'].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  No se encontraron facturas registradas.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const isPaid = inv.status === 'PAID'
                const isIssued = inv.status === 'ISSUED'
                const isVoid = inv.status === 'VOID'

                const statusColor = isPaid
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
                  : isIssued
                  ? 'bg-amber-950/60 text-amber-400 border-amber-900'
                  : isVoid
                  ? 'bg-red-950/60 text-red-400 border-red-900'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'

                return (
                  <tr key={inv.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                      {new Date(inv.issuedAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {inv.table ? `Mesa ${inv.table.tableNumber}` : inv.customerName ?? 'Cliente General'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      ${inv.subtotal.toNumber().toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      ${inv.taxAmount.toNumber().toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      ${inv.total.toNumber().toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/billing/invoices/${inv.id}`}
                        className="text-xs font-medium text-amber-500 hover:text-amber-400"
                      >
                        Ver Detalle / Cobrar
                      </Link>
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
