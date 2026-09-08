import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { buildInvoiceDraft, createInvoiceFromDraft } from '@/lib/billing/invoice-builder'

const CreateInvoiceSchema = z.object({
  tableId: z.string().min(1),
  sessionId: z.string().min(1),
  waiterId: z.string().optional(),
  customerName: z.string().optional(),
  customerTaxId: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
})

/**
 * GET /api/invoices?status=PAID&from=2024-01-01&to=2024-01-31&page=1
 * Lista facturas del restaurante con filtros opcionales.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { restaurantId?: string; role: string }
    if (!user.restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER']
    if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const params = request.nextUrl.searchParams
    const status = params.get('status')
    const from = params.get('from')
    const to = params.get('to')
    const page = parseInt(params.get('page') ?? '1', 10)
    const pageSize = 50

    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId: user.restaurantId,
        ...(status ? { status: status as never } : {}),
        ...(from || to
          ? {
              issuedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
              },
            }
          : {}),
      },
      include: {
        table: { select: { tableNumber: true } },
        waiter: { select: { name: true } },
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        ...inv,
        subtotal: inv.subtotal.toNumber(),
        taxAmount: inv.taxAmount.toNumber(),
        serviceCharge: inv.serviceCharge.toNumber(),
        discountAmount: inv.discountAmount.toNumber(),
        total: inv.total.toNumber(),
      })),
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[GET /api/invoices]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/invoices
 * Crea una factura a partir de las órdenes abiertas de una mesa.
 * Genera el número de folio y calcula IVA según la config del restaurante.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const user = session.user as { id: string; restaurantId?: string; role: string }
    const restaurantId = user.restaurantId
    if (!restaurantId) return NextResponse.json({ error: 'Sin restaurante' }, { status: 403 })

    const allowedRoles = ['SUPERADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER']
    if (!allowedRoles.includes(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const {
      tableId,
      sessionId,
      waiterId,
      customerName,
      customerTaxId,
      customerEmail,
      notes,
      discountAmount,
    } = CreateInvoiceSchema.parse(body)

    // Verificar que la mesa pertenece al restaurante
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
    })
    if (!table) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })

    // Verificar que no hay factura ISSUED/PAID ya para esta sesión
    const existing = await prisma.invoice.findFirst({
      where: { sessionId, status: { in: ['ISSUED', 'PAID'] } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una factura activa para esta sesión', invoiceId: existing.id },
        { status: 409 },
      )
    }

    // Construir draft y crear factura
    const draft = await buildInvoiceDraft(restaurantId, tableId, sessionId, discountAmount)

    if (draft.items.length === 0) {
      return NextResponse.json({ error: 'No hay órdenes activas para facturar en esta sesión' }, { status: 422 })
    }

    const invoiceId = await createInvoiceFromDraft(draft, {
      waiterId: waiterId ?? user.id,
      customerName,
      customerTaxId,
      customerEmail: customerEmail || undefined,
      notes,
      discountAmount,
    })

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true, table: { select: { tableNumber: true } } },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos inválidos', details: error.flatten() }, { status: 400 })
    console.error('[POST /api/invoices]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
