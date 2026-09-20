import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TaxConfigSchema = z.object({
  country: z.enum(['CO', 'MX', 'CL', 'PE', 'OTHER']).optional(),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(5).optional(),
  vatRate: z.number().min(0).max(1).optional(),
  vatEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().min(0).max(1).optional(),
  serviceChargeEnabled: z.boolean().optional(),
  reteFuenteEnabled: z.boolean().optional(),
  reteFuenteRate: z.number().min(0).max(1).optional(),
  reteIvaEnabled: z.boolean().optional(),
  reteIvaRate: z.number().min(0).max(1).optional(),
  reteIcaEnabled: z.boolean().optional(),
  reteIcaRate: z.number().min(0).max(1).optional(),
  legalName: z.string().max(200).optional(),
  taxId: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal('')),
  invoiceFooter: z.string().max(500).optional(),
  invoicePrefix: z.string().max(10).optional(),
  ticketEnabled: z.boolean().optional(),
  ticketWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  ticketLogoUrl: z.string().url().optional().or(z.literal('')),
  ticketHeader: z.string().max(200).optional(),
  ticketFooter: z.string().max(200).optional(),
  ticketShowLogo: z.boolean().optional(),
  ticketShowTax: z.boolean().optional(),
  ticketShowTable: z.boolean().optional(),
  ticketShowWaiter: z.boolean().optional(),
})

/**
 * GET /api/billing/config
 * Obtiene la configuración fiscal del restaurante.
 * Si no existe, devuelve la config por defecto para Colombia.
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    let config = await prisma.taxConfig.findUnique({
      where: { restaurantId: user.restaurantId },
    })

    // Auto-crear con defaults de Colombia si no existe
    if (!config) {
      config = await prisma.taxConfig.create({
        data: { restaurantId: user.restaurantId },
      })
    }

    return NextResponse.json({
      config: {
        ...config,
        vatRate: config.vatRate.toNumber(),
        serviceChargeRate: config.serviceChargeRate.toNumber(),
        reteFuenteRate: (config as any).reteFuenteRate ? Number((config as any).reteFuenteRate) : 0.025,
        reteIvaRate: (config as any).reteIvaRate ? Number((config as any).reteIvaRate) : 0.15,
        reteIcaRate: (config as any).reteIcaRate ? Number((config as any).reteIcaRate) : 0.00966,
      },
    })
  } catch (error) {
    console.error('[GET /api/billing/config]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/billing/config
 * Actualiza la configuración fiscal del restaurante.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const adminRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']
    if (!adminRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const data = TaxConfigSchema.parse(body)

    const config = await prisma.taxConfig.upsert({
      where: { restaurantId: user.restaurantId },
      create: { restaurantId: user.restaurantId, ...data },
      update: data,
    })

    return NextResponse.json({
      config: {
        ...config,
        vatRate: config.vatRate.toNumber(),
        serviceChargeRate: config.serviceChargeRate.toNumber(),
        reteFuenteRate: (config as any).reteFuenteRate ? Number((config as any).reteFuenteRate) : 0.025,
        reteIvaRate: (config as any).reteIvaRate ? Number((config as any).reteIvaRate) : 0.15,
        reteIcaRate: (config as any).reteIcaRate ? Number((config as any).reteIcaRate) : 0.00966,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[PATCH /api/billing/config]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
