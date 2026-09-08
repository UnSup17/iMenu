import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TaxConfigForm } from '@/components/billing/tax-config-form'

export const metadata = { title: 'Configuración Fiscal y Facturación — iMenu' }

export default async function BillingConfigPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role: string }
  const allowed = ['SUPERADMIN', 'RESTAURANT_ADMIN']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  const restaurantId = user.restaurantId!

  const config = await prisma.taxConfig.findUnique({
    where: { restaurantId },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">⚙️ Configuración Fiscal y Comprobantes</h1>
        <p className="text-sm text-zinc-400">
          Personaliza las tarifas de impuestos (IVA), información legal, resolución de facturación (DIAN / SAT) e impresiones de ticket.
        </p>
      </div>

      <TaxConfigForm initialData={config} />
    </div>
  )
}
