import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTableSession } from '@/lib/redis'
import { FoodCourtPage } from '@/components/food-court/FoodCourtPage'
import { isCategoryScheduleActive } from '@/lib/menu-schedule'
import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'

interface PageProps {
  params: Promise<{ foodCourtSlug: string; tableId: string }>
  searchParams: Promise<{ token?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { foodCourtSlug } = await params
  const foodCourt = await prisma.foodCourt.findUnique({
    where: { slug: foodCourtSlug },
    select: { name: true, description: true },
  })

  return {
    title: foodCourt ? `${foodCourt.name} — Menú Digital` : 'Plaza Gastronómica — iMenu',
    description: foodCourt?.description || 'Explora todos los restaurantes de la plaza y ordena desde tu mesa.',
  }
}

export default async function FoodCourtGuestPage({ params, searchParams }: PageProps) {
  const { foodCourtSlug, tableId } = await params
  const { token } = await searchParams

  // 1. Verificar token presente en URL
  if (!token) {
    redirect(`/menu/invalid?reason=no_token`)
  }

  // 2. Validar sesión
  const redisSession = await getTableSession(token)
  if (!redisSession || redisSession.tableId !== tableId) {
    console.warn(`[FoodCourtGuestPage] Acceso denegado: sesión inválida o no coincide con mesa ${tableId}`)
    redirect(`/menu/invalid?reason=expired_session`)
  }

  // 3. Cargar la plaza con todos sus restaurantes miembros activos y sus cartas
  const foodCourt = await prisma.foodCourt.findUnique({
    where: { slug: foodCourtSlug, isActive: true },
    include: {
      memberships: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          restaurant: {
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
              hotspots: {
                include: {
                  product: {
                    include: {
                      modifierGroups: {
                        include: { options: true },
                      },
                      ingredients: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  if (!foodCourt) {
    notFound()
  }

  // Cargar pagos de mesa ya registrados para esta sesión
  const tablePayments = await prisma.foodCourtTablePayment.findMany({
    where: { sessionId: redisSession.sessionId },
    include: {
      restaurant: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      invoice: {
        select: { invoiceNumber: true },
      },
    },
  })

  // Cargar unresolved stock issues de todos los restaurantes de la plaza
  const restaurantIds = foodCourt.memberships.map((m) => m.restaurantId)
  const rawStockIssues = await prisma.productStockIssue.findMany({
    where: {
      restaurantId: { in: restaurantIds },
      resolvedAt: null,
    },
    include: { inventoryItem: true },
  })

  const now = new Date()

  // Serializar cada restaurante miembro
  const serializedRestaurants = foodCourt.memberships.map((m) => {
    const res = m.restaurant

    // Filtrar categorías con ofertas activas
    const activeCategories = res.categories.filter((cat) =>
      isCategoryScheduleActive(
        {
          isSpecialOffer: cat.isSpecialOffer,
          offerStartDate: cat.offerStartDate,
          offerEndDate: cat.offerEndDate,
          offerActiveDays: cat.offerActiveDays,
          offerStartTime: cat.offerStartTime,
          offerEndTime: cat.offerEndTime,
        },
        now,
      ),
    )

    const categories = activeCategories.map((cat) => ({
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

    const pdfHotspots = res.hotspots.map((hs) => ({
      id: hs.id,
      page: hs.page,
      x: hs.x,
      y: hs.y,
      width: hs.width,
      height: hs.height,
      product: {
        id: hs.product.id,
        name: hs.product.name,
        description: hs.product.description,
        basePrice: hs.product.basePrice.toNumber(),
        imageUrl: hs.product.imageUrl,
        modifierGroups: hs.product.modifierGroups.map((g) => ({
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
        ingredients: hs.product.ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          isRemovable: ing.isRemovable,
        })),
      },
    }))

    const initialStockIssues = rawStockIssues
      .filter((si) => si.restaurantId === res.id)
      .map((si) => ({
        productId: si.productId,
        ingredientName: si.inventoryItem.name,
      }))

    return {
      id: res.id,
      name: res.name,
      slug: res.slug,
      logoUrl: res.logoUrl,
      description: res.description,
      cuisineType: res.cuisineType,
      currency: res.currency,
      orderIndex: m.orderIndex,
      categories,
      pdfUrl: res.pdfUrl ?? null,
      pdfHotspots,
      initialStockIssues,
    }
  })

  // Serializar pagos para el checklist
  const initialPayments = tablePayments.map((tp) => ({
    id: tp.id,
    restaurantId: tp.restaurantId,
    restaurantName: tp.restaurant.name,
    restaurantSlug: tp.restaurant.slug,
    restaurantLogo: tp.restaurant.logoUrl,
    status: tp.status,
    totalAmount: Number(tp.totalAmount),
    paidAt: tp.paidAt?.toISOString() || null,
    invoiceNumber: tp.invoice?.invoiceNumber || null,
  }))

  const brandTheme = await getResolvedBrandTheme({ foodCourtId: foodCourt.id })

  return (
    <>
      <BrandThemeInjector theme={brandTheme} />
      <FoodCourtPage
        foodCourt={{
          id: foodCourt.id,
          name: foodCourt.name,
          slug: foodCourt.slug,
          description: foodCourt.description,
          logoUrl: brandTheme.logoUrl || foodCourt.logoUrl,
          currency: foodCourt.currency,
        }}
        tableId={tableId}
        tableNumber={redisSession.tableNumber}
        sessionToken={token}
        sessionId={redisSession.sessionId}
        restaurants={serializedRestaurants}
        initialPayments={initialPayments}
      />
    </>
  )
}
