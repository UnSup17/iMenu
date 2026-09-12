import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { MenuManager } from '@/components/menu/MenuManager'

export const metadata: Metadata = {
  title: 'Gestor de Menú — iMenu',
  description: 'Administra categorías, productos y ofertas especiales del menú de tu restaurante.',
}

const ALLOWED_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

export default async function MenuManagerPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sessionUser = session.user as { id: string; role: string }
  if (!ALLOWED_ROLES.includes(sessionUser.role)) redirect('/dashboard')

  // Resolver restaurantId del usuario autenticado
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { restaurantId: true, organizationId: true },
  })

  let restaurantId = user?.restaurantId
  if (!restaurantId && user?.organizationId) {
    const first = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    restaurantId = first?.id ?? null
  }
  if (!restaurantId && sessionUser.role === 'SUPERADMIN') {
    const first = await prisma.restaurant.findFirst({ select: { id: true } })
    restaurantId = first?.id ?? null
  }
  if (!restaurantId) redirect('/dashboard')

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    orderBy: [{ isSpecialOffer: 'asc' }, { orderIndex: 'asc' }],
    include: {
      products: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          basePrice: true,
          isAvailable: true,
          imageUrl: true,
          orderIndex: true,
          allergens: true,
          scheduledPrice: true,
          scheduledPriceDays: true,
          scheduledPriceStart: true,
          scheduledPriceEnd: true,
          scheduledPriceLabel: true,
        },
      },
    },
  })

  // Serializar Decimal → number
  const serialized = categories.map((cat) => ({
    ...cat,
    offerStartDate: cat.offerStartDate?.toISOString() ?? null,
    offerEndDate: cat.offerEndDate?.toISOString() ?? null,
    products: cat.products.map((p) => ({
      ...p,
      basePrice: p.basePrice.toNumber(),
      scheduledPrice: p.scheduledPrice ? p.scheduledPrice.toNumber() : null,
    })),
  }))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <MenuManager initialCategories={serialized} />
    </div>
  )
}
