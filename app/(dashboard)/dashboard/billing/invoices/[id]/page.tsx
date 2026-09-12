import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { InvoicePaymentAction } from '@/components/billing/invoice-payment-action'
import { TicketPrintButton } from '@/components/billing/ticket-print-button'
import { DianInvoiceAction } from '@/components/billing/dian-invoice-action'
import { WhatsAppInvoiceButton } from '@/components/billing/WhatsAppInvoiceButton'

export const metadata = { title: 'Detalle de Factura — iMenu' }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAITER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, restaurantId: user.restaurantId },
    include: {
      table: true,
      items: true,
      payments: true,
      restaurant: true,
    },
  })

  if (!invoice) redirect('/dashboard/billing/invoices')

  const paidAmount = invoice.payments.reduce((acc, p) => acc + p.amount.toNumber(), 0)
  const remainingAmount = Math.max(0, invoice.total.toNumber() - paidAmount)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              Factura N° <span className="text-amber-400 font-mono">{invoice.invoiceNumber}</span>
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                invoice.status === 'PAID'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
                  : invoice.status === 'ISSUED'
                  ? 'bg-amber-950/60 text-amber-400 border-amber-900'
                  : 'bg-red-950/60 text-red-400 border-red-900'
              }`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Fecha: {new Date(invoice.issuedAt).toLocaleString('es-CO')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <WhatsAppInvoiceButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            restaurantName={invoice.restaurant.name}
            totalAmount={invoice.total.toNumber()}
            customerName={invoice.customerName}
            itemsSummary={invoice.items.map((i) => ({
              name: i.description,
              quantity: i.quantity,
              subtotal: i.subtotal.toNumber(),
            }))}
          />
          <TicketPrintButton invoiceId={invoice.id} />
          <Link
            href="/dashboard/billing/invoices"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
          >
            ← Volver a Facturas
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Invoice Summary & Items */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Detalle de Ítems
            </h2>
            <div className="divide-y divide-zinc-800/80">
              {invoice.items.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-white">{item.description}</p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {item.quantity} x ${item.unitPrice.toNumber().toLocaleString('es-CO')} (IVA {item.taxRate.toNumber() * 100}%)
                    </p>
                  </div>
                  <div className="text-right font-mono font-semibold text-white">
                    ${(item.subtotal.toNumber() + item.taxAmount.toNumber()).toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>${invoice.subtotal.toNumber().toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>IVA / Impuestos:</span>
                <span>${invoice.taxAmount.toNumber().toLocaleString('es-CO')}</span>
              </div>
              {invoice.discountAmount.toNumber() > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Descuento:</span>
                  <span>-${invoice.discountAmount.toNumber().toLocaleString('es-CO')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-emerald-400 pt-2 border-t border-zinc-800">
                <span>TOTAL FACTURA:</span>
                <span>${invoice.total.toNumber().toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Breakdown Column */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Estado de Pago
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Total Facturado:</span>
                <span className="font-mono text-white font-semibold">
                  ${invoice.total.toNumber().toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Pagado:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  ${paidAmount.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 border-t border-zinc-800 pt-2">
                <span>Saldo Pendiente:</span>
                <span className="font-mono text-amber-400 font-bold">
                  ${remainingAmount.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Historial de Pagos
              </h3>
              {invoice.payments.length === 0 ? (
                <p className="text-xs text-zinc-600">No hay pagos registrados aún.</p>
              ) : (
                <div className="space-y-2">
                  {invoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-white">{p.method}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {new Date(p.receivedAt).toLocaleTimeString('es-CO')}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        ${p.amount.toNumber().toLocaleString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
              <div className="pt-4 border-t border-zinc-800">
                <InvoicePaymentAction invoiceId={invoice.id} remainingAmount={remainingAmount} />
              </div>
            )}
          </div>

          {/* Widget DIAN Electrónica */}
          <DianInvoiceAction
            invoiceId={invoice.id}
            initialCufe={invoice.electronicInvoiceId}
            initialStatus={invoice.electronicInvoiceStatus}
          />
        </div>
      </div>
    </div>
  )
}
