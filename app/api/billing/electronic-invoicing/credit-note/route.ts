import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCreditNoteToDian } from '@/lib/dian/soap-client'
import { DianCreditNotePayload, DianDiscrepancyCode } from '@/lib/dian/types'
import { z } from 'zod'

const creditNoteSchema = z.object({
  invoiceId: z.string(),
  discrepancyCode: z.enum(['1', '2', '3', '4', '5']).default('2'),
  discrepancyDescription: z.string().min(3, 'Indique el motivo de la Nota Crédito'),
  items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number(),
        taxRate: z.number(),
        taxAmount: z.number(),
        subtotal: z.number(),
        total: z.number(),
      })
    )
    .optional(),
})

const DISCREPANCY_LABELS: Record<DianDiscrepancyCode, string> = {
  '1': 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
  '2': 'Anulación de factura electrónica',
  '3': 'Rebaja o descuento parcial o total',
  '4': 'Ajuste de precio',
  '5': 'Otros',
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const body = await req.json()
    const parsed = creditNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { invoiceId, discrepancyCode, discrepancyDescription, items: customItems } = parsed.data

    const [invoice, taxConfig, dianConfig] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      }),
      prisma.taxConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
      prisma.electronicInvoiceConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
    ])

    if (!invoice || invoice.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    if (!invoice.electronicInvoiceId) {
      return NextResponse.json(
        { error: 'La factura original debe tener un CUFE emitido ante la DIAN antes de aplicar una Nota Crédito' },
        { status: 400 }
      )
    }

    const now = new Date()
    const issueDate = now.toISOString().slice(0, 10)
    const issueTime = `${now.toTimeString().slice(0, 8)}-05:00`
    const originalDate = new Date(invoice.issuedAt).toISOString().slice(0, 10)

    const prefix = 'NC'
    const noteSequence = Math.floor(Date.now() / 1000) % 100000
    const noteNumber = `${prefix}-${String(noteSequence).padStart(4, '0')}`
    const fullNumber = `${prefix}${String(noteSequence).padStart(4, '0')}`

    // Si no se especificaron ítems particulares, se toman todos los ítems de la factura (anulación total)
    const items =
      customItems ||
      invoice.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate),
        taxAmount: Number(it.taxAmount),
        subtotal: Number(it.subtotal),
        total: Number(it.subtotal) + Number(it.taxAmount),
      }))

    const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0)
    const taxTotal = items.reduce((acc, it) => acc + it.taxAmount, 0)
    const total = subtotal + taxTotal

    const payload: DianCreditNotePayload = {
      prefix,
      noteNumber,
      fullNumber,
      issueDate,
      issueTime,
      originalInvoiceNumber: invoice.invoiceNumber,
      originalCufe: invoice.electronicInvoiceId,
      originalIssueDate: originalDate,
      discrepancyCode,
      discrepancyDescription: `${DISCREPANCY_LABELS[discrepancyCode]}: ${discrepancyDescription}`,
      company: {
        legalName: taxConfig?.legalName || 'Restaurante iMenu S.A.S.',
        taxId: taxConfig?.taxId ? taxConfig.taxId.replace(/[^0-9]/g, '') : '900123456',
        dv: '7',
        taxScheme: '01',
        address: taxConfig?.address || 'Calle 10 # 40-20',
        phone: taxConfig?.phone || '6012345678',
        email: taxConfig?.email || 'facturacion@imenu.co',
      },
      customer: {
        name: invoice.customerName || 'Consumidor Final',
        taxId: invoice.customerTaxId || '222222222222',
        email: invoice.customerEmail || undefined,
      },
      items,
      subtotal,
      taxTotal,
      total,
      technicalKey: dianConfig?.technicalKey || undefined,
      environment: dianConfig?.testMode === false ? '1' : '2',
    }

    const dianResult = await sendCreditNoteToDian(payload)

    // Si es anulación completa (código 2), actualizar estado de la factura original
    if (discrepancyCode === '2' && dianResult.success) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: `Anulada por Nota Crédito ${noteNumber}: ${discrepancyDescription}`,
          electronicInvoiceStatus: 'VOIDED_BY_CREDIT_NOTE',
        },
      })
    }

    // Registrar en logs de facturación electrónica
    await prisma.electronicInvoiceLog.create({
      data: {
        invoiceId,
        zipName: dianResult.zipName,
        cufe: dianResult.cufe, // CUDE de la nota crédito
        qrCode: dianResult.qrCodeUrl,
        status: dianResult.status,
        dianResponse: dianResult.dianResponseXml || dianResult.message,
      },
    })

    return NextResponse.json({
      success: dianResult.success,
      noteNumber,
      cude: dianResult.cufe,
      qrCodeUrl: dianResult.qrCodeUrl,
      status: dianResult.status,
      message: dianResult.message,
    })
  } catch (error) {
    console.error('Error al emitir Nota Crédito DIAN:', error)
    return NextResponse.json({ error: 'Error interno al procesar Nota Crédito' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(req.url)
    const invoiceId = url.searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requerido' }, { status: 400 })
    }

    const logs = await prisma.electronicInvoiceLog.findMany({
      where: {
        invoiceId,
        zipName: { startsWith: 'nc' },
      },
      orderBy: { sentAt: 'desc' },
    })

    return NextResponse.json({ creditNotes: logs })
  } catch (error) {
    console.error('Error al listar notas crédito:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
