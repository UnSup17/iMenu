import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  enqueuePdfConversionJob,
  getPdfConversionJob,
  processPdfConversionJob,
} from '@/lib/pdf/queue'

export const runtime = 'nodejs'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN']

/**
 * POST /api/pdf/convert
 * Encola un trabajo de conversión asíncrono para PDFs de gran volumen (>50 páginas).
 * Responde en <100ms mientras el worker procesa en segundo plano.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string; restaurantId?: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    let body: { pdfUrl?: string; restaurantId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // Body vacío permitido
    }

    const targetRestaurantId = body.restaurantId || user.restaurantId
    if (!targetRestaurantId) {
      return NextResponse.json({ error: 'Restaurante no especificado' }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: targetRestaurantId },
      select: { id: true, slug: true, pdfUrl: true },
    })

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    const pdfUrl = body.pdfUrl || restaurant.pdfUrl
    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'No hay ningún archivo PDF asociado a este restaurante' },
        { status: 400 }
      )
    }

    // 1. Encolar trabajo
    const job = await enqueuePdfConversionJob({
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      pdfUrl,
    })

    // 2. Disparar worker en background de forma no bloqueante (Fire-and-forget)
    processPdfConversionJob(job.id).catch((err) => {
      console.error(`[BackgroundWorker] Error no capturado en job ${job.id}:`, err)
    })

    // 3. Responder de inmediato (< 100ms)
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Conversión de PDF iniciada en segundo plano',
    })
  } catch (error) {
    console.error('[POST /api/pdf/convert] Error:', error)
    return NextResponse.json(
      { error: 'Error al iniciar la conversión del PDF' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pdf/convert?jobId=...
 * Permite el sondeo (polling) en tiempo real del progreso de la conversión.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Falta el parámetro jobId' }, { status: 400 })
    }

    const job = await getPdfConversionJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 })
    }

    const progressPercentage =
      job.totalPages > 0
        ? Math.min(100, Math.round((job.processedPages / job.totalPages) * 100))
        : 0

    return NextResponse.json({
      success: true,
      job: {
        ...job,
        progressPercentage,
      },
    })
  } catch (error) {
    console.error('[GET /api/pdf/convert] Error:', error)
    return NextResponse.json(
      { error: 'Error al consultar el progreso de la conversión' },
      { status: 500 }
    )
  }
}
