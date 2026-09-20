import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendTestSetToDian } from '@/lib/dian/soap-client'
import { DianDocumentPayload, DianTestSetItemResult, DianTestSetBatchResult } from '@/lib/dian/types'
import { z } from 'zod'

const testSetSchema = z.object({
  testSetId: z.string().optional(),
  count: z.number().int().min(1).max(10).default(5),
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

    const body = await req.json().catch(() => ({}))
    const parsed = testSetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const [taxConfig, dianConfig] = await Promise.all([
      prisma.taxConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
      prisma.electronicInvoiceConfig.findUnique({ where: { restaurantId: user.restaurantId } }),
    ])

    const testSetId =
      parsed.data.testSetId ||
      dianConfig?.softwareId ||
      'dian-test-set-imenu-habilitacion-2026'

    const prefix = dianConfig?.resolutionPrefix || 'SETP'
    const company = {
      legalName: taxConfig?.legalName || 'Restaurante iMenu Habilitación S.A.S.',
      taxId: taxConfig?.taxId ? taxConfig.taxId.replace(/[^0-9]/g, '') : '900123456',
      dv: '7',
      taxScheme: '01',
      address: taxConfig?.address || 'Calle 100 # 15-20',
      phone: taxConfig?.phone || '6015551234',
      email: taxConfig?.email || 'habilitacion@imenu.co',
    }

    const count = parsed.data.count
    const results: DianTestSetItemResult[] = []

    // Generar y transmitir cada documento del lote de pruebas
    for (let i = 1; i <= count; i++) {
      const now = new Date()
      const issueDate = now.toISOString().slice(0, 10)
      const issueTime = `${now.toTimeString().slice(0, 8)}-05:00`
      const docNumber = `${prefix}${String(1000 + i)}`

      const payload: DianDocumentPayload = {
        prefix,
        invoiceNumber: `${prefix}-${1000 + i}`,
        fullNumber: docNumber,
        issueDate,
        issueTime,
        company,
        customer: {
          name: i % 2 === 0 ? 'Empresa B2B Pruebas S.A.S.' : 'Consumidor Final Pruebas',
          taxId: i % 2 === 0 ? '901999888' : '222222222222',
          email: 'pruebas@imenu.co',
        },
        items: [
          {
            id: `ITEM-TEST-${i}-1`,
            code: `PROD-${i}`,
            description: `Plato Gourmet de Prueba DIAN #${i}`,
            quantity: i,
            unitPrice: 25000,
            taxRate: 0.19,
            taxAmount: 25000 * i * 0.19,
            subtotal: 25000 * i,
            total: 25000 * i * 1.19,
          },
        ],
        subtotal: 25000 * i,
        taxTotal: 25000 * i * 0.19,
        discountTotal: 0,
        total: 25000 * i * 1.19,
        paymentMethod: i % 2 === 0 ? '48' : '10', // Tarjeta o Efectivo
        technicalKey: dianConfig?.technicalKey || undefined,
        environment: '2', // Siempre ambiente de pruebas
      }

      const res = await sendTestSetToDian(testSetId, payload)

      results.push({
        documentType: 'INVOICE',
        number: docNumber,
        cufeOrCude: res.cufe,
        status: res.status === 'TEST_PASSED' ? 'TEST_PASSED' : 'TEST_FAILED',
        message: res.message,
      })
    }

    const passed = results.filter((r) => r.status === 'TEST_PASSED').length
    const failed = results.length - passed

    const responseData: DianTestSetBatchResult = {
      testSetId,
      totalSent: results.length,
      passed,
      failed,
      environment: '2',
      items: results,
    }

    return NextResponse.json({
      success: failed === 0,
      ...responseData,
    })
  } catch (error) {
    console.error('Error al ejecutar Set de Pruebas DIAN:', error)
    return NextResponse.json({ error: 'Error interno al procesar el Set de Pruebas' }, { status: 500 })
  }
}
