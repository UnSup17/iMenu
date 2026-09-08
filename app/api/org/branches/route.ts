import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBranchLimit } from '@/lib/subscription'
import { z } from 'zod'

const createBranchSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  currency: z.string().default('COP'),
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { organizationId?: string; restaurantId?: string }
    let orgId = user.organizationId

    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
      orgId = rest?.organizationId || undefined
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    const branches = await prisma.restaurant.findMany({
      where: { organizationId: orgId },
      include: {
        tables: { select: { id: true, status: true } },
        _count: {
          select: {
            orders: true,
            invoices: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const branchLimit = await checkBranchLimit(orgId)

    return NextResponse.json({
      branches,
      limitInfo: branchLimit,
    })
  } catch (error) {
    console.error('Error al obtener sucursales:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { organizationId?: string; restaurantId?: string; role?: string }
    let orgId = user.organizationId

    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
      orgId = rest?.organizationId || undefined
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organización requerida' }, { status: 400 })
    }

    // Verificar límites de sucursales según el plan
    const limitInfo = await checkBranchLimit(orgId)
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${limitInfo.maxAllowed} sucursales de tu ${limitInfo.tier}. Por favor actualiza a un plan superior.`,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = createBranchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { name, slug, currency } = parsed.data

    // Verificar que el slug no exista
    const existing = await prisma.restaurant.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'El identificador (slug) ya está en uso. Elige otro.' }, { status: 400 })
    }

    // Crear sucursal con configuración fiscal inicial
    const newBranch = await prisma.restaurant.create({
      data: {
        organizationId: orgId,
        name,
        slug,
        currency,
        taxConfig: {
          create: {
            country: 'CO',
            currency: 'COP',
            currencySymbol: '$',
            vatRate: 0.19,
            vatEnabled: true,
            legalName: name,
            invoicePrefix: 'FV',
            nextInvoiceNumber: 1,
          },
        },
      },
      include: {
        taxConfig: true,
      },
    })

    return NextResponse.json(newBranch, { status: 201 })
  } catch (error) {
    console.error('Error al crear sucursal:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
