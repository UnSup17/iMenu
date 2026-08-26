import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTableSession } from '@/lib/redis'
import { MenuPage } from '@/components/menu/MenuPage'

interface PageProps {
  params: Promise<{ restaurantSlug: string; tableId: string }>
  searchParams: Promise<{ token?: string }>
}

// ============================================================
// Metadata dinámica
// ============================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { restaurantSlug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
    select: { name: true },
  })

  return {
    title: restaurant ? `Menú — ${restaurant.name}` : 'iMenu',
    description: 'Consulta el menú, personaliza tu pedido y pídelo desde tu mesa.',
  }
}

// ============================================================
// Page — Server Component
// ============================================================

export default async function MenuGuestPage({ params, searchParams }: PageProps) {
  const { restaurantSlug, tableId } = await params
  const { token } = await searchParams

  // 1. Verificar token presente en URL
  if (!token) {
    redirect(`/menu/invalid?reason=no_token`)
  }

  // 2. Validar sesión en Redis (rápido)
  const redisSession = await getTableSession(token)
  if (!redisSession || redisSession.tableId !== tableId) {
    redirect(`/menu/invalid?reason=expired_session`)
  }

  // 3. Cargar datos del restaurante y menú
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug, isActive: true },
    include: {
      categories: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          products: {
            where: { isAvailable: true },
            include: {
              modifierGroups: {
                include: { options: true },
              },
              ingredients: true,
            },
          },
        },
      },
    },
  })

  if (!restaurant || restaurant.id !== redisSession.restaurantId) {
    notFound()
  }

  // Serializar Decimal → number para el cliente
  const categories = restaurant.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    products: cat.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice.toNumber(),
      imageUrl: p.imageUrl,
      modifierGroups: p.modifierGroups.map((g) => ({
        id: g.id,
        name: g.name,
        type: g.type as 'SINGLE_SELECT' | 'ADDON',
        isRequired: g.isRequired,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        options: g.options.map((o) => ({
          id: o.id,
          name: o.name,
          extraPrice: o.extraPrice.toNumber(),
          isAvailable: o.isAvailable,
        })),
      })),
      ingredients: p.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        isRemovable: ing.isRemovable,
      })),
    })),
  }))

  return (
    <MenuPage
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      tableId={tableId}
      tableNumber={redisSession.tableNumber}
      sessionToken={token}
      currency={restaurant.currency}
      categories={categories}
    />
  )
}
