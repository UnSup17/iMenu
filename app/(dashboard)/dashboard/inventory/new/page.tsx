import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { InventoryItemForm } from '@/components/inventory/item-form'

export const metadata = { title: 'Nuevo Ítem de Inventario — iMenu' }

export default async function NewInventoryItemPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { role: string }
  const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowed.includes(user.role)) redirect('/dashboard')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">➕ Nuevo Ítem de Inventario</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Registra un nuevo ingrediente o insumo para llevar control del stock y relacionarlo a tus productos.
      </p>

      <InventoryItemForm />
    </div>
  )
}
