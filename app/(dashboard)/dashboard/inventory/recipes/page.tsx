import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RecipeEditor } from '@/components/inventory/recipe-editor'

export const metadata = { title: 'Recetas de Productos — iMenu' }

export default async function RecipesPage() {
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

  const [products, inventoryItems] = await Promise.all([
    prisma.product.findMany({
      where: { restaurantId, isAvailable: true },
      include: {
        recipeItems: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.inventoryItem.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">🍳 Recetas y Composición de Platos</h1>
        <p className="text-sm text-zinc-400">
          Asigna los ingredientes y cantidades exactas que utiliza cada ítem del menú para que el stock se descuente automáticamente al pedir.
        </p>
      </div>

      <RecipeEditor
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.basePrice.toNumber(),
          recipeItems: p.recipeItems.map((ri) => ({
            id: ri.id,
            inventoryItemId: ri.inventoryItemId,
            quantity: ri.quantity.toNumber(),
            inventoryItem: {
              name: ri.inventoryItem.name,
              unit: ri.inventoryItem.unit,
            },
          })),
        }))}
        inventoryItems={inventoryItems.map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          currentStock: i.currentStock.toNumber(),
        }))}
      />
    </div>
  )
}
