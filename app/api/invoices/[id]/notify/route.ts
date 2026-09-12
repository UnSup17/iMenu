import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInvoiceEmail } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email de destino no válido' },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        restaurant: { select: { name: true } },
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invoiceUrl = `${appUrl}/dashboard/billing/invoices/${invoice.id}`

    await sendInvoiceEmail({
      to: email,
      invoiceNumber: invoice.invoiceNumber,
      restaurantName: invoice.restaurant.name,
      totalAmount: invoice.total.toNumber(),
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        subtotal: item.subtotal.toNumber(),
      })),
      invoiceUrl,
    })

    return NextResponse.json({
      success: true,
      message: `Comprobante enviado exitosamente a ${email}`,
    })
  } catch (error: any) {
    console.error('[API] Error notifying invoice email:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar email' },
      { status: 500 }
    )
  }
}
