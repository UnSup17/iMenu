import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const feedbackSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId requerido'),
  tableId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  tags: z.string().optional().nullable(),
  comment: z.string().max(1000).optional().nullable(),
  customerName: z.string().max(80).optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos inválidos' },
        { status: 400 }
      )
    }

    const { restaurantId, tableId, sessionId, rating, tags, comment, customerName } = parsed.data

    let feedbackId: string
    if ((prisma as any).tableSessionFeedback) {
      const feedback = await prisma.tableSessionFeedback.create({
        data: {
          restaurantId,
          tableId: tableId || null,
          sessionId: sessionId || null,
          rating,
          tags: tags || null,
          comment: comment?.trim() || null,
          customerName: customerName?.trim() || null,
        },
      })
      feedbackId = feedback.id
    } else {
      const crypto = await import('crypto')
      feedbackId = crypto.randomUUID()
      await prisma.$executeRawUnsafe(
        `INSERT INTO table_session_feedback (id, restaurantId, tableId, sessionId, rating, tags, comment, customerName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        feedbackId,
        restaurantId,
        tableId || null,
        sessionId || null,
        rating,
        tags || null,
        comment?.trim() || null,
        customerName?.trim() || null
      )
    }

    return NextResponse.json({
      success: true,
      id: feedbackId,
      message: '¡Gracias por compartir tu opinión!',
    })
  } catch (error) {
    console.error('[Feedback API error]:', error)
    return NextResponse.json({ error: 'Error al registrar tu opinión' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const restaurantId =
    req.nextUrl.searchParams.get('restaurantId') || session.user.restaurantId

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 })
  }

  try {
    const feedbacks = await prisma.tableSessionFeedback.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        table: {
          select: { tableNumber: true, zone: true },
        },
      },
    })

    const aggregate = await prisma.tableSessionFeedback.aggregate({
      where: { restaurantId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return NextResponse.json({
      feedbacks,
      averageRating: aggregate._avg.rating ?? 0,
      totalCount: aggregate._count.rating ?? 0,
    })
  } catch (error) {
    console.error('[Feedback GET error]:', error)
    return NextResponse.json({ error: 'Error al consultar feedback' }, { status: 500 })
  }
}
