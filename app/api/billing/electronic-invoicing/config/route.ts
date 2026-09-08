import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const dianConfigSchema = z.object({
  testMode: z.boolean().default(true),
  softwareId: z.string().optional().nullable(),
  softwarePin: z.string().optional().nullable(),
  technicalKey: z.string().optional().nullable(),
  certificateUrl: z.string().optional().nullable(),
  certificatePassword: z.string().optional().nullable(),
  resolutionNumber: z.string().optional().nullable(),
  resolutionPrefix: z.string().optional().nullable(),
  resolutionFrom: z.number().int().optional().nullable(),
  resolutionTo: z.number().int().optional().nullable(),
  resolutionDate: z.string().optional().nullable(),
  resolutionEnd: z.string().optional().nullable(),
})

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

    const config = await prisma.electronicInvoiceConfig.findUnique({
      where: { restaurantId: user.restaurantId },
    })

    return NextResponse.json(config || { testMode: true })
  } catch (error) {
    console.error('Error al obtener configuración DIAN:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
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
    const parsed = dianConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const data = parsed.data

    const updated = await prisma.electronicInvoiceConfig.upsert({
      where: { restaurantId: user.restaurantId },
      create: {
        restaurantId: user.restaurantId,
        testMode: data.testMode,
        softwareId: data.softwareId,
        softwarePin: data.softwarePin,
        technicalKey: data.technicalKey,
        certificateUrl: data.certificateUrl,
        certificatePassword: data.certificatePassword,
        resolutionNumber: data.resolutionNumber,
        resolutionPrefix: data.resolutionPrefix,
        resolutionFrom: data.resolutionFrom,
        resolutionTo: data.resolutionTo,
        resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : null,
        resolutionEnd: data.resolutionEnd ? new Date(data.resolutionEnd) : null,
      },
      update: {
        testMode: data.testMode,
        softwareId: data.softwareId,
        softwarePin: data.softwarePin,
        technicalKey: data.technicalKey,
        certificateUrl: data.certificateUrl,
        certificatePassword: data.certificatePassword,
        resolutionNumber: data.resolutionNumber,
        resolutionPrefix: data.resolutionPrefix,
        resolutionFrom: data.resolutionFrom,
        resolutionTo: data.resolutionTo,
        resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : null,
        resolutionEnd: data.resolutionEnd ? new Date(data.resolutionEnd) : null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al guardar configuración DIAN:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
