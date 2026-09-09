import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { getTableSession } from '@/lib/redis'
import { MenuPage } from '@/components/menu/MenuPage'
import { isCategoryScheduleActive } from '@/lib/menu-schedule'
import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'

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

  // 2. Validar sesión (Memoria / Redis / DB fallback)
  const redisSession = await getTableSession(token)
  if (!redisSession || redisSession.tableId !== tableId) {
    console.warn(`[MenuGuestPage] Acceso denegado: sesión inválida o no coincide con mesa ${tableId}`)
    redirect(`/menu/invalid?reason=expired_session`)
  }

  // Si la mesa pertenece a una plaza gastronómica, redirigir a la vista de plaza
  if (redisSession.venueType === 'food_court' && redisSession.foodCourtId) {
    const fc = await prisma.foodCourt.findUnique({
      where: { id: redisSession.foodCourtId },
      select: { slug: true },
    })
    if (fc) {
      redirect(`/plaza/${fc.slug}/${tableId}?token=${token}`)
    }
  }

  // 3. Cargar datos del restaurante y menú (incluyendo PDF y hotspots)
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
  })

  if (!restaurant || restaurant.id !== redisSession.restaurantId) {
    notFound()
  }

  // Fetch unresolved stock issues
  const rawStockIssues = await prisma.productStockIssue.findMany({
    where: { restaurantId: restaurant.id, resolvedAt: null },
    include: { inventoryItem: true },
  })

  const initialStockIssues = rawStockIssues.map((si) => ({
    productId: si.productId,
    ingredientName: si.inventoryItem.name,
  }))

  // Filtrar categorías de oferta especial que no están activas en este momento
  const now = new Date()
  const activeCategories = restaurant.categories.filter((cat) =>
    isCategoryScheduleActive({
      isSpecialOffer: cat.isSpecialOffer,
      offerStartDate: cat.offerStartDate,
      offerEndDate: cat.offerEndDate,
      offerActiveDays: cat.offerActiveDays,
      offerStartTime: cat.offerStartTime,
      offerEndTime: cat.offerEndTime,
    }, now),
  )

  // Cargar adiciones activas del restaurante con sus categorías y productos
  const rawAdditions = await prisma.addition.findMany({
    where: { restaurantId: restaurant.id, isAvailable: true },
    include: {
      categories: true,
      products: true,
      inventoryItem: true,
    },
  })

  const getAdditionsForProduct = (categoryId: string, productId: string) => {
    return rawAdditions
      .filter(
        (a) =>
          a.categories.some((c) => c.categoryId === categoryId) ||
          a.products.some((pr) => pr.productId === productId),
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: a.price.toNumber(),
        isOutOfStock: a.inventoryItem ? a.inventoryItem.currentStock.toNumber() <= 0 : false,
      }))
  }

  // Serializar Decimal → number para el cliente
  const categories = activeCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    products: cat.products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice.toNumber(),
      imageUrl: p.imageUrl,
      additions: getAdditionsForProduct(cat.id, p.id),
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

  // Serializar hotspots del PDF
  const pdfHotspots = restaurant.hotspots.map((hs) => ({
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
      additions: getAdditionsForProduct(hs.product.categoryId, hs.product.id),
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

  const brandTheme = await getResolvedBrandTheme({ restaurantId: restaurant.id })

  return (
    <>
      <BrandThemeInjector theme={brandTheme} />
      <MenuPage
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        tableId={tableId}
        tableNumber={redisSession.tableNumber}
        sessionToken={token}
        currency={restaurant.currency}
        categories={categories}
        pdfUrl={restaurant.pdfUrl ?? null}
        pdfHotspots={pdfHotspots}
        initialStockIssues={initialStockIssues}
        brandLogoUrl={brandTheme.logoUrl}
        brandCoverBannerUrl={brandTheme.coverBannerUrl}
      />
    </>
  )
}

