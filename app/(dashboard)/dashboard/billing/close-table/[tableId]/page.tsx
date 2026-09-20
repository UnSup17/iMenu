import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TableCheckoutForm } from '@/components/billing/table-checkout-form'

export const metadata = { title: 'Cierre de Mesa y Facturación — iMenu' }

export default async function CloseTablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAITER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const { tableId } = await params
  const restaurantId = user.restaurantId!

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
    include: {
      sessions: {
        where: { closedAt: null },
        include: {
          orders: {
            where: { status: { in: ['RECEIVED', 'PREPARING', 'READY', 'DELIVERED'] } },
            include: {
              items: {
                include: { product: true },
              },
            },
          },
        },
      },
    },
  })

  if (!table || table.sessions.length === 0) {
    redirect('/dashboard/billing')
  }

  const activeSession = table.sessions[0]
  const orders = activeSession.orders

  const taxConfig = await prisma.taxConfig.findUnique({
    where: { restaurantId },
  })

  const vatPercentage = taxConfig?.vatRate ? taxConfig.vatRate.toNumber() * 100 : 19

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            💳 Cierre y Facturación — Mesa {table.tableNumber}
          </h1>
          <p className="text-sm text-zinc-400">
            Revisa el consumo total de la mesa, datos del cliente y registra el pago para emitir la factura.
          </p>
        </div>
        <a
          href={`/api/billing/proforma?tableId=${table.id}&format=html`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 font-semibold text-xs rounded-xl border border-zinc-800 hover:border-amber-500/30 transition flex items-center gap-2 shadow-sm"
        >
          <span>📄</span>
          <span>Ver Factura Proforma ↗</span>
        </a>
      </div>

      <TableCheckoutForm
        tableId={table.id}
        sessionId={activeSession.id}
        tableNumber={table.tableNumber}
        orders={orders.map((o) => ({
          id: o.id,
          totalAmount: o.totalAmount.toNumber(),
          items: o.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            productName: i.product.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice.toNumber(),
            subtotal: i.subtotal.toNumber(),
          })),
        }))}
        taxConfig={{
          country: taxConfig?.country ?? 'CO',
          standardRate: vatPercentage,
          taxName: taxConfig?.country === 'CO' ? 'IVA' : 'Impuesto',
        }}
      />
    </div>
  )
}
