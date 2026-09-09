import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SpecialOffersClient } from '@/components/special-offers/SpecialOffersClient'
import { calculateSpecialOffersReport } from '@/lib/accounting/calculator'

export default async function SpecialOffersDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as {
    id: string
    role?: string
    restaurantId?: string | null
    organizationId?: string | null
  }

  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']
  if (!allowedRoles.includes(user.role || '')) {
    redirect('/dashboard')
  }

  // Buscar restaurante activo del usuario o el primero de la organización
  let restaurant = null
  if (user.restaurantId) {
    restaurant = await prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
    })
  } else if (user.organizationId) {
    restaurant = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
    })
  }

  if (!restaurant) {
    restaurant = await prisma.restaurant.findFirst()
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center text-zinc-400">
        No se encontró ningún restaurante activo configurado.
      </div>
    )
  }

  // Cargar categorías que son ofertas especiales / menús temporales
  const specialCategories = await prisma.category.findMany({
    where: {
      restaurantId: restaurant.id,
      isSpecialOffer: true,
    },
    include: {
      products: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  // Cargar todos los platos especiales con sus datos de cupo
  const rawProducts = await prisma.product.findMany({
    where: {
      restaurantId: restaurant.id,
      OR: [
        { category: { isSpecialOffer: true } },
        { specialOfferStock: { not: null } },
      ],
    },
    include: {
      category: {
        select: { name: true, offerLabel: true, isSpecialOffer: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const allSpecialDishes = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    basePrice: Number(p.basePrice),
    isAvailable: p.isAvailable,
    specialOfferStock: p.specialOfferStock,
    specialOfferStockSold: p.specialOfferStockSold,
    specialOfferCost: p.specialOfferCost ? Number(p.specialOfferCost) : null,
    categoryName: p.category.name,
    offerLabel: p.category.offerLabel,
  }))

  const serializedCategories = specialCategories.map((c) => ({
    id: c.id,
    name: c.name,
    offerLabel: c.offerLabel,
    offerStartDate: c.offerStartDate?.toISOString() || null,
    offerEndDate: c.offerEndDate?.toISOString() || null,
    offerActiveDays: c.offerActiveDays,
    offerStartTime: c.offerStartTime,
    offerEndTime: c.offerEndTime,
    isActive: c.isActive,
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      basePrice: Number(p.basePrice),
      isAvailable: p.isAvailable,
      specialOfferStock: p.specialOfferStock,
      specialOfferStockSold: p.specialOfferStockSold,
      specialOfferCost: p.specialOfferCost ? Number(p.specialOfferCost) : null,
    })),
  }))

  // Calcular reporte contable del mes en curso
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const report = await calculateSpecialOffersReport(
    restaurant.id,
    startOfMonth,
    endOfMonth,
    `Mes Actual (${now.toLocaleString('es-CO', { month: 'long', year: 'numeric' })})`
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <SpecialOffersClient
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        currency={restaurant.currency}
        categories={serializedCategories}
        allSpecialDishes={allSpecialDishes}
        report={report}
      />
    </div>
  )
}
