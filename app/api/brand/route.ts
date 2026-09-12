import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { DEFAULT_BRAND_THEME, type BrandThemeData } from '@/lib/branding/types'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'

const BrandThemeSchema = z.object({
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color primario inválido'),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color secundario inválido'),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color de acento inválido'),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color de fondo inválido'),
  surfaceColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color de superficie inválido'),
  textColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color de texto inválido'),
  textMutedColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color secundario de texto inválido'),
  fontHeading: z.string().min(1),
  fontBody: z.string().min(1),
  borderRadius: z.string().min(1),
  coverBannerUrl: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  allowBranchOverrides: z.boolean().optional(),
  useCustomTheme: z.boolean().optional(),
  whiteLabelEnabled: z.boolean().optional(),
  glassmorphismEnabled: z.boolean().optional(),
  buttonStyle: z.string().optional(),
  targetType: z.enum(['ORGANIZATION', 'RESTAURANT', 'FOOD_COURT']).optional(),
  targetId: z.string().optional(),
  isProposal: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = session.user as {
      id: string
      role?: string
      organizationId?: string | null
      restaurantId?: string | null
      foodCourtId?: string | null
    }

    const { searchParams } = new URL(request.url)
    const queryRestaurantId = searchParams.get('restaurantId') || user.restaurantId
    const queryFoodCourtId = searchParams.get('foodCourtId') || user.foodCourtId
    const queryOrgId = searchParams.get('organizationId') || user.organizationId

    // 1. Obtener tema resuelto
    const resolvedTheme = await getResolvedBrandTheme({
      restaurantId: queryRestaurantId,
      foodCourtId: queryFoodCourtId,
      organizationId: queryOrgId,
    })

    // 2. Información de contexto de organización y sede
    let orgTheme: BrandThemeData | null = null
    let branchTheme: BrandThemeData | null = null
    let allowBranchOverrides = true

    if (queryOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: queryOrgId },
        include: { brandTheme: true },
      })
      if (org?.brandTheme) {
        orgTheme = {
          ...DEFAULT_BRAND_THEME,
          ...org.brandTheme,
        }
        allowBranchOverrides = org.brandTheme.allowBranchOverrides
      }
    }

    if (queryRestaurantId) {
      const res = await prisma.restaurant.findUnique({
        where: { id: queryRestaurantId },
        include: {
          brandTheme: true,
          organization: { include: { brandTheme: true } },
        },
      })
      if (res?.brandTheme) {
        branchTheme = {
          ...DEFAULT_BRAND_THEME,
          ...res.brandTheme,
        }
      }
      if (res?.organization?.brandTheme) {
        allowBranchOverrides = res.organization.brandTheme.allowBranchOverrides
        if (!orgTheme) {
          orgTheme = {
            ...DEFAULT_BRAND_THEME,
            ...res.organization.brandTheme,
          }
        }
      }
    }

    return NextResponse.json({
      theme: resolvedTheme,
      orgTheme,
      branchTheme,
      allowBranchOverrides,
      role: user.role,
      canEditOrg: ['SUPERADMIN', 'ORG_ADMIN'].includes(user.role || ''),
      canEditBranch: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'].includes(user.role || ''),
      canEditFoodCourt: ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN'].includes(user.role || ''),
    })
  } catch (error: any) {
    console.error('[GET /api/brand] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener tema de marca' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = session.user as {
      id: string
      role?: string
      organizationId?: string | null
      restaurantId?: string | null
      foodCourtId?: string | null
    }

    const body = await request.json()
    const parsed = BrandThemeSchema.parse(body)

    // A. Guardar tema a nivel de Franquicia / Organización (ORG_ADMIN o SUPERADMIN)
    if (parsed.targetType === 'ORGANIZATION' || (!parsed.targetType && user.role === 'ORG_ADMIN' && user.organizationId)) {
      const orgId = parsed.targetId || user.organizationId
      if (!orgId) {
        return NextResponse.json({ error: 'ID de organización requerido' }, { status: 400 })
      }
      if (user.role !== 'SUPERADMIN' && user.organizationId !== orgId) {
        return NextResponse.json({ error: 'No autorizado para esta organización' }, { status: 403 })
      }

      const updated = await prisma.brandTheme.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          accentColor: parsed.accentColor,
          backgroundColor: parsed.backgroundColor,
          surfaceColor: parsed.surfaceColor,
          textColor: parsed.textColor,
          textMutedColor: parsed.textMutedColor,
          fontHeading: parsed.fontHeading,
          fontBody: parsed.fontBody,
          borderRadius: parsed.borderRadius,
          coverBannerUrl: parsed.coverBannerUrl,
          logoUrl: parsed.logoUrl,
          allowBranchOverrides: parsed.allowBranchOverrides ?? true,
        },
        update: {
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          accentColor: parsed.accentColor,
          backgroundColor: parsed.backgroundColor,
          surfaceColor: parsed.surfaceColor,
          textColor: parsed.textColor,
          textMutedColor: parsed.textMutedColor,
          fontHeading: parsed.fontHeading,
          fontBody: parsed.fontBody,
          borderRadius: parsed.borderRadius,
          coverBannerUrl: parsed.coverBannerUrl,
          logoUrl: parsed.logoUrl,
          ...(parsed.allowBranchOverrides !== undefined && { allowBranchOverrides: parsed.allowBranchOverrides }),
        },
      })

      return NextResponse.json({ success: true, theme: updated })
    }

    // B. Guardar o proponer tema a nivel de Plaza Gastronómica (FOOD_COURT_ADMIN, ORG_ADMIN, SUPERADMIN)
    if (parsed.targetType === 'FOOD_COURT' || (!parsed.targetType && user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId)) {
      const fcId = parsed.targetId || user.foodCourtId
      if (!fcId) {
        return NextResponse.json({ error: 'ID de plaza gastronómica requerido' }, { status: 400 })
      }
      if (user.role === 'FOOD_COURT_ADMIN' && user.foodCourtId !== fcId) {
        return NextResponse.json({ error: 'No autorizado para esta plaza' }, { status: 403 })
      }

      const updated = await prisma.brandTheme.upsert({
        where: { foodCourtId: fcId },
        create: {
          foodCourtId: fcId,
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          accentColor: parsed.accentColor,
          backgroundColor: parsed.backgroundColor,
          surfaceColor: parsed.surfaceColor,
          textColor: parsed.textColor,
          textMutedColor: parsed.textMutedColor,
          fontHeading: parsed.fontHeading,
          fontBody: parsed.fontBody,
          borderRadius: parsed.borderRadius,
          coverBannerUrl: parsed.coverBannerUrl,
          logoUrl: parsed.logoUrl,
        },
        update: {
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          accentColor: parsed.accentColor,
          backgroundColor: parsed.backgroundColor,
          surfaceColor: parsed.surfaceColor,
          textColor: parsed.textColor,
          textMutedColor: parsed.textMutedColor,
          fontHeading: parsed.fontHeading,
          fontBody: parsed.fontBody,
          borderRadius: parsed.borderRadius,
          coverBannerUrl: parsed.coverBannerUrl,
          logoUrl: parsed.logoUrl,
        },
      })

      return NextResponse.json({ success: true, theme: updated })
    }

    // C. Guardar o proponer tema a nivel de Sede / Restaurante
    const resId = parsed.targetId || user.restaurantId
    if (!resId) {
      return NextResponse.json({ error: 'ID de restaurante requerido' }, { status: 400 })
    }

    // Obtener información de la sede y su organización
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: resId },
      include: { organization: { include: { brandTheme: true } } },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    // Validar permisos
    if (user.role === 'RESTAURANT_ADMIN' && user.restaurantId !== resId) {
      return NextResponse.json({ error: 'No autorizado para este restaurante' }, { status: 403 })
    }

    const orgAllowsOverrides = restaurant.organization?.brandTheme?.allowBranchOverrides ?? true

    // Si el usuario es RESTAURANT_ADMIN y envía una propuesta o quiere aplicar cambios directos
    if (parsed.isProposal && restaurant.organizationId) {
      // Guardar propuesta para revisión del ORG_ADMIN
      const updated = await prisma.brandTheme.upsert({
        where: { restaurantId: resId },
        create: {
          restaurantId: resId,
          primaryColor: parsed.primaryColor,
          secondaryColor: parsed.secondaryColor,
          accentColor: parsed.accentColor,
          backgroundColor: parsed.backgroundColor,
          surfaceColor: parsed.surfaceColor,
          textColor: parsed.textColor,
          textMutedColor: parsed.textMutedColor,
          fontHeading: parsed.fontHeading,
          fontBody: parsed.fontBody,
          borderRadius: parsed.borderRadius,
          coverBannerUrl: parsed.coverBannerUrl,
          logoUrl: parsed.logoUrl,
          useCustomTheme: false,
          branchProposal: parsed,
        },
        update: {
          branchProposal: parsed,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Propuesta de personalización enviada al administrador de la franquicia para aprobación.',
        theme: updated,
      })
    }

    // Si no es franquicia o la franquicia permite overrides directos
    if (restaurant.organizationId && !orgAllowsOverrides && user.role !== 'ORG_ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json({
        error: 'La franquicia no permite modificaciones locales en esta sede.',
      }, { status: 403 })
    }

    const updated = await prisma.brandTheme.upsert({
      where: { restaurantId: resId },
      create: {
        restaurantId: resId,
        primaryColor: parsed.primaryColor,
        secondaryColor: parsed.secondaryColor,
        accentColor: parsed.accentColor,
        backgroundColor: parsed.backgroundColor,
        surfaceColor: parsed.surfaceColor,
        textColor: parsed.textColor,
        textMutedColor: parsed.textMutedColor,
        fontHeading: parsed.fontHeading,
        fontBody: parsed.fontBody,
        borderRadius: parsed.borderRadius,
        coverBannerUrl: parsed.coverBannerUrl,
        logoUrl: parsed.logoUrl,
        useCustomTheme: parsed.useCustomTheme ?? true,
        whiteLabelEnabled: parsed.whiteLabelEnabled ?? false,
        glassmorphismEnabled: parsed.glassmorphismEnabled ?? true,
        buttonStyle: parsed.buttonStyle ?? 'rounded',
      },
      update: {
        primaryColor: parsed.primaryColor,
        secondaryColor: parsed.secondaryColor,
        accentColor: parsed.accentColor,
        backgroundColor: parsed.backgroundColor,
        surfaceColor: parsed.surfaceColor,
        textColor: parsed.textColor,
        textMutedColor: parsed.textMutedColor,
        fontHeading: parsed.fontHeading,
        fontBody: parsed.fontBody,
        borderRadius: parsed.borderRadius,
        coverBannerUrl: parsed.coverBannerUrl,
        logoUrl: parsed.logoUrl,
        useCustomTheme: parsed.useCustomTheme ?? true,
        ...(parsed.whiteLabelEnabled !== undefined && { whiteLabelEnabled: parsed.whiteLabelEnabled }),
        ...(parsed.glassmorphismEnabled !== undefined && { glassmorphismEnabled: parsed.glassmorphismEnabled }),
        ...(parsed.buttonStyle !== undefined && { buttonStyle: parsed.buttonStyle }),
      },
    })

    return NextResponse.json({ success: true, theme: updated })
  } catch (error: any) {
    console.error('[PUT /api/brand] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al guardar tema de marca' }, { status: 400 })
  }
}
