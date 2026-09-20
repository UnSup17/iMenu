import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEventUpdateStatus } from '@/lib/dian/soap-client'
import { DianEventPayload, DianEventCode } from '@/lib/dian/types'
import { z } from 'zod'

const eventSchema = z.object({
  invoiceId: z.string(),
  eventCode: z.enum(['030', '031', '032', '033', '034', '04']),
  comment: z.string().optional(),
})

const EVENT_DESCRIPTIONS: Record<DianEventCode, string> = {
  '030': 'Acuse de recibo de Factura Electrónica de Venta',
  '031': 'Reclamo de la Factura Electrónica de Venta',
  '032': 'Recibo del bien y/o prestación del servicio',
  '033': 'Aceptación expresa',
  '034': 'Aceptación tácita',
  '04': 'Notificación de documento anulado ante la DIAN',
}

/**
 * POST: Emite un evento ante la DIAN (Acuse B2B o Anulación de Documento).
 */
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
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { invoiceId, eventCode, comment } = parsed.data

    const [invoice, taxConfig, dianConfig] = await Promise.all([
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
      prisma.taxConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
      prisma.electronicInvoiceConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
    ])

    if (!invoice || invoice.restaurantId !== user.restaurantId) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    if (!invoice.electronicInvoiceId) {
      return NextResponse.json(
        { error: 'La factura aún no cuenta con CUFE electrónico emitido ante la DIAN' },
        { status: 400 }
      )
    }

    const now = new Date(invoice.issuedAt)
    const issueDate = now.toISOString().slice(0, 10)

    const payload: DianEventPayload = {
      eventCode,
      eventDescription: EVENT_DESCRIPTIONS[eventCode],
      invoiceNumber: invoice.invoiceNumber,
      invoiceCufe: invoice.electronicInvoiceId,
      invoiceIssueDate: issueDate,
      issuer: {
        legalName: taxConfig?.legalName || 'Restaurante iMenu S.A.S.',
        taxId: taxConfig?.taxId ? taxConfig.taxId.replace(/[^0-9]/g, '') : '900123456',
        dv: '7',
        taxScheme: '01',
      },
      receiver: {
        name: invoice.customerName || 'Consumidor Final',
        taxId: invoice.customerTaxId || '222222222222',
        email: invoice.customerEmail || undefined,
      },
      environment: dianConfig?.testMode === false ? '1' : '2',
      comment,
    }

    const result = await sendEventUpdateStatus(payload)

    // Si es evento 04 (anulación) y tuvo éxito, actualizar estado de anulación en Invoice
    if (eventCode === '04' && result.success) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          voidedAt: new Date(),
          voidReason: comment || 'Anulada electrónicamente ante la DIAN',
          status: 'VOID',
          electronicInvoiceStatus: 'VOIDED',
        },
      })
    }

    // Registrar log de evento
    await prisma.electronicInvoiceLog.create({
      data: {
        invoiceId,
        cufe: invoice.electronicInvoiceId,
        status: result.status,
        dianResponse: result.dianResponseXml || result.message,
        errorMessage: result.success ? null : result.message,
      },
    })

    return NextResponse.json({
      success: result.success,
      eventCode: result.eventCode,
      eventDescription: EVENT_DESCRIPTIONS[eventCode],
      status: result.status,
      message: result.message,
    })
  } catch (error) {
    console.error('Error al emitir evento DIAN:', error)
    return NextResponse.json({ error: 'Error interno al registrar evento DIAN' }, { status: 500 })
  }
}

/**
 * GET: Consulta los eventos registrados para una factura.
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(req.url)
    const invoiceId = url.searchParams.get('invoiceId')
    if (!invoiceId) {
      return NextResponse.json({ error: 'Parámetro invoiceId requerido' }, { status: 400 })
    }

    const logs = await prisma.electronicInvoiceLog.findMany({
      where: { invoiceId },
      orderBy: { sentAt: 'desc' },
    })

    return NextResponse.json({ events: logs })
  } catch (error) {
    console.error('Error al obtener eventos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
