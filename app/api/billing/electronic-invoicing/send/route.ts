import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInvoiceToDian } from '@/lib/dian/soap-client'
import { DianDocumentPayload } from '@/lib/dian/types'
import { z } from 'zod'

const sendDianSchema = z.object({
  invoiceId: z.string(),
})

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
    const parsed = sendDianSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { invoiceId } = parsed.data

    const [invoice, taxConfig, dianConfig] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true, table: true },
      }),
      prisma.taxConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
      prisma.electronicInvoiceConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
    ])

    if (!invoice || invoice.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    const now = new Date(invoice.issuedAt)
    const issueDate = now.toISOString().slice(0, 10)
    const issueTime = `${now.toTimeString().slice(0, 8)}-05:00`

    const prefix = dianConfig?.resolutionPrefix || taxConfig?.invoicePrefix || 'FV'
    const fullNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '')

    const payload: DianDocumentPayload = {
      prefix,
      invoiceNumber: invoice.invoiceNumber,
      fullNumber,
      issueDate,
      issueTime,
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
      items: invoice.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
        taxAmount: Number(i.taxAmount),
        subtotal: Number(i.subtotal),
        total: Number(i.subtotal) + Number(i.taxAmount),
      })),
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxAmount),
      discountTotal: Number(invoice.discountAmount),
      total: Number(invoice.total),
      paymentMethod: invoice.paymentMethod === 'CASH' ? '10' : '48',
      technicalKey: dianConfig?.technicalKey || undefined,
      environment: dianConfig?.testMode === false ? '1' : '2',
    }

    const dianResult = await sendInvoiceToDian(payload)

    // Actualizar factura y registrar log de auditoría
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          electronicInvoiceId: dianResult.cufe,
          electronicInvoiceStatus: dianResult.status,
        },
      }),
      prisma.electronicInvoiceLog.create({
        data: {
          invoiceId,
          zipName: dianResult.zipName,
          cufe: dianResult.cufe,
          qrCode: dianResult.qrCodeUrl,
          status: dianResult.status,
          dianResponse: dianResult.dianResponseXml || dianResult.message,
        },
      }),
    ])

    return NextResponse.json({
      success: dianResult.success,
      cufe: dianResult.cufe,
      qrCodeUrl: dianResult.qrCodeUrl,
      status: dianResult.status,
      message: dianResult.message,
    })
  } catch (error) {
    console.error('Error al emitir factura DIAN:', error)
    return NextResponse.json({ error: 'Error interno al procesar factura electrónica' }, { status: 500 })
  }
}
