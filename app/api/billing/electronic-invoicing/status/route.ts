import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDianDocumentStatus } from '@/lib/dian/soap-client'
import { z } from 'zod'

const checkStatusSchema = z.object({
  invoiceId: z.string().optional(),
  trackId: z.string().optional(),
})

/**
 * GET: Polling automático / worker de facturas pendientes de validación DIAN.
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    // Buscar logs pendientes de este restaurante
    const pendingLogs = await prisma.electronicInvoiceLog.findMany({
      where: {
        status: { in: ['pending', 'PENDING'] },
        invoice: { restaurantId: user.restaurantId },
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      take: 20, // Procesa en lotes de 20
    })

    if (pendingLogs.length === 0) {
      return NextResponse.json({
        message: 'No hay facturas electrónicas pendientes de verificación en la DIAN.',
        processed: 0,
      })
    }

    const dianConfig = await prisma.electronicInvoiceConfig.findUnique({
      where: { restaurantId: user.restaurantId },
    })
    const env = dianConfig?.testMode === false ? '1' : '2'

    const results = []

    for (const log of pendingLogs) {
      const trackId = log.zipName || log.cufe || log.id
      const checkResult = await checkDianDocumentStatus(trackId, env)

      if (checkResult.status !== 'PENDING') {
        await prisma.$transaction([
          prisma.electronicInvoiceLog.update({
            where: { id: log.id },
            data: {
              status: checkResult.status,
              dianResponse: checkResult.dianResponseXml || checkResult.message,
              respondedAt: new Date(),
            },
          }),
          prisma.invoice.update({
            where: { id: log.invoiceId },
            data: {
              electronicInvoiceStatus: checkResult.status,
            },
          }),
        ])
      }

      results.push({
        invoiceId: log.invoiceId,
        invoiceNumber: log.invoice.invoiceNumber,
        trackId,
        status: checkResult.status,
        message: checkResult.message,
      })
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      updated: results.filter((r) => r.status !== 'PENDING').length,
      details: results,
    })
  } catch (error) {
    console.error('Error al consultar estado de facturas DIAN:', error)
    return NextResponse.json({ error: 'Error interno al consultar estado DIAN' }, { status: 500 })
  }
}

/**
 * POST: Consulta manual bajo demanda del estado de una factura o paquete específico.
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
    const parsed = checkStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { invoiceId, trackId: inputTrackId } = parsed.data

    let targetInvoiceId = invoiceId
    let trackId = inputTrackId

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          electronicInvoiceLogs: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!invoice || invoice.restaurantId !== user.restaurantId) {
        return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
      }

      const latestLog = invoice.electronicInvoiceLogs[0]
      trackId = trackId || latestLog?.zipName || invoice.electronicInvoiceId || invoice.id
    }

    if (!trackId) {
      return NextResponse.json({ error: 'No se pudo determinar el identificador de rastreo DIAN' }, { status: 400 })
    }

    const dianConfig = await prisma.electronicInvoiceConfig.findUnique({
      where: { restaurantId: user.restaurantId },
    })
    const env = dianConfig?.testMode === false ? '1' : '2'

    const checkResult = await checkDianDocumentStatus(trackId, env)

    if (targetInvoiceId && checkResult.status !== 'PENDING') {
      await prisma.invoice.update({
        where: { id: targetInvoiceId },
        data: { electronicInvoiceStatus: checkResult.status },
      })
    }

    return NextResponse.json({
      success: true,
      trackId,
      status: checkResult.status,
      statusCode: checkResult.statusCode,
      message: checkResult.message,
    })
  } catch (error) {
    console.error('Error al verificar estado DIAN:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
