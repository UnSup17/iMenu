import { prisma } from '@/lib/prisma'
import { BrandThemeData, DEFAULT_BRAND_THEME } from './types'

export async function getResolvedBrandTheme(params: {
  restaurantId?: string | null
  restaurantSlug?: string | null
  foodCourtId?: string | null
  foodCourtSlug?: string | null
  organizationId?: string | null
}): Promise<BrandThemeData> {
  try {
    // 1. Resolver por restaurante
    if (params.restaurantId || params.restaurantSlug) {
      const restaurant = await prisma.restaurant.findUnique({
        where: params.restaurantId
          ? { id: params.restaurantId }
          : { slug: params.restaurantSlug! },
        include: {
          brandTheme: true,
          organization: {
            include: { brandTheme: true },
          },
        },
      })

      if (restaurant) {
        const orgTheme = restaurant.organization?.brandTheme
        const branchTheme = restaurant.brandTheme

        // Si la sede tiene su propio tema activado (useCustomTheme = true)
        if (branchTheme && branchTheme.useCustomTheme) {
          return {
            ...DEFAULT_BRAND_THEME,
            ...branchTheme,
            logoUrl: branchTheme.logoUrl || restaurant.logoUrl || orgTheme?.logoUrl || null,
          }
        }

        // Si la franquicia u organización tiene tema configurado
        if (orgTheme) {
          return {
            ...DEFAULT_BRAND_THEME,
            ...orgTheme,
            // Permite usar el logo de la sede si existe, o el de la organización
            logoUrl: branchTheme?.logoUrl || restaurant.logoUrl || orgTheme.logoUrl || null,
            coverBannerUrl: branchTheme?.coverBannerUrl || orgTheme.coverBannerUrl || null,
          }
        }

        // Si el restaurante tiene tema directo (restaurante independiente)
        if (branchTheme) {
          return {
            ...DEFAULT_BRAND_THEME,
            ...branchTheme,
            logoUrl: branchTheme.logoUrl || restaurant.logoUrl || null,
          }
        }

        // Si tiene logo propio en restaurant.logoUrl
        if (restaurant.logoUrl) {
          return {
            ...DEFAULT_BRAND_THEME,
            logoUrl: restaurant.logoUrl,
          }
        }
      }
    }

    // 2. Resolver por plaza gastronómica (Food Court)
    if (params.foodCourtId || params.foodCourtSlug) {
      const foodCourt = await prisma.foodCourt.findUnique({
        where: params.foodCourtId
          ? { id: params.foodCourtId }
          : { slug: params.foodCourtSlug! },
        include: {
          brandTheme: true,
          organization: {
            include: { brandTheme: true },
          },
        },
      })

      if (foodCourt) {
        const fcTheme = foodCourt.brandTheme || foodCourt.organization?.brandTheme
        if (fcTheme) {
          return {
            ...DEFAULT_BRAND_THEME,
            ...fcTheme,
            logoUrl: fcTheme.logoUrl || foodCourt.logoUrl || null,
          }
        }
        if (foodCourt.logoUrl) {
          return {
            ...DEFAULT_BRAND_THEME,
            logoUrl: foodCourt.logoUrl,
          }
        }
      }
    }

    // 3. Resolver por Organización directa
    if (params.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: params.organizationId },
        include: { brandTheme: true },
      })
      if (org?.brandTheme) {
        return {
          ...DEFAULT_BRAND_THEME,
          ...org.brandTheme,
          logoUrl: org.brandTheme.logoUrl || org.logoUrl || null,
        }
      }
    }

    return DEFAULT_BRAND_THEME
  } catch (error) {
    console.error('[getResolvedBrandTheme] Error resolving theme:', error)
    return DEFAULT_BRAND_THEME
  }
}
