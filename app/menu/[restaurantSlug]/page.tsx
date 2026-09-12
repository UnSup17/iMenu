import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { MenuPage } from '@/components/menu/MenuPage'
import { isCategoryScheduleActive } from '@/lib/menu-schedule'
import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'

interface PageProps {
  params: Promise<{ restaurantSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { restaurantSlug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug, isActive: true },
    select: { name: true, description: true },
  })

  return {
    title: restaurant ? `Menú Digital — ${restaurant.name}` : 'Menú iMenu',
    description:
      restaurant?.description ||
      'Consulta nuestra carta gastronómica, platillos, bebidas y precios actualizados en tiempo real.',
  }
}

export default async function MenuViewOnlyPage({ params }: PageProps) {
  const { restaurantSlug } = await params

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

  if (!restaurant) {
    notFound()
  }

  // Filtrar categorías de oferta especial activas
  const now = new Date()
  const activeCategories = restaurant.categories.filter((cat) =>
    isCategoryScheduleActive(
      {
        isSpecialOffer: cat.isSpecialOffer,
        offerStartDate: cat.offerStartDate,
        offerEndDate: cat.offerEndDate,
        offerActiveDays: cat.offerActiveDays,
        offerStartTime: cat.offerStartTime,
        offerEndTime: cat.offerEndTime,
      },
      now
    )
  )

  // Cargar adiciones activas
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
          a.products.some((pr) => pr.productId === productId)
      )
      .map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        price: a.price.toNumber(),
        isOutOfStock: a.inventoryItem ? a.inventoryItem.currentStock.toNumber() <= 0 : false,
      }))
  }

  // Serializar categorías y productos
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

  // Serializar hotspots de PDF
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
        tableId=""
        tableNumber={0}
        sessionToken=""
        currency={restaurant.currency}
        categories={categories}
        pdfUrl={restaurant.pdfUrl ?? null}
        pdfHotspots={pdfHotspots}
        initialStockIssues={[]}
        brandLogoUrl={brandTheme.logoUrl}
        brandCoverBannerUrl={brandTheme.coverBannerUrl}
        isViewOnly={true}
      />
    </>
  )
}
