import { NextRequest, NextResponse } from 'next/server'
import { createTableSession } from '@/server/actions/create-session.action'
import { closeTableSession } from '@/server/actions/close-session.action'
import { getTableSession } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ tableId: string }>
}

/**
 * GET /api/tables/[tableId]/session?token=xxx
 * Valida un token de sesión existente (usado por el frontend del comensal al cargar).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tableId } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido.' }, { status: 400 })
  }

  let session = await getTableSession(token)

  if (!session) {
    // Fallback a la Base de Datos (MySQL) si Redis está inalcanzable o expiró en caché
    const dbSession = await prisma.tableSession.findFirst({
      where: {
        sessionToken: token,
        tableId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: { table: true },
    })

    if (dbSession) {
      session = {
        sessionId: dbSession.id,
        tableId: dbSession.tableId,
        restaurantId: dbSession.table.restaurantId,
        foodCourtId: dbSession.table.foodCourtId,
        venueType: dbSession.table.foodCourtId ? 'food_court' : 'single',
        tableNumber: dbSession.table.tableNumber,
        expiresAt: dbSession.expiresAt.toISOString(),
      }
    }
  }

  if (!session || session.tableId !== tableId) {
    return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 })
  }

  return NextResponse.json({ valid: true, session })
}

/**
 * POST /api/tables/[tableId]/session
 * Crea una nueva sesión de mesa (solo staff autenticado).
 * Body: { restaurantId?: string, foodCourtId?: string, ttlSeconds?: number }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authSession = await auth()
  if (!authSession?.user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { tableId } = await params
  const body = await request.json()

  try {
    const result = await createTableSession({
      restaurantId: body.restaurantId,
      foodCourtId: body.foodCourtId,
      tableId,
      ttlSeconds: body.ttlSeconds ?? 7200,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[POST /api/tables/session] Error:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE /api/tables/[tableId]/session
 * Cierra una sesión activa (solo staff autenticado).
 * Body: { sessionToken: string, restaurantId?: string, foodCourtId?: string, forceClose?: boolean }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authSession = await auth()
  if (!authSession?.user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const { tableId } = await params
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    // Body vacío o no-JSON
  }

  try {
    const result = await closeTableSession({
      tableId,
      sessionToken: body.sessionToken,
      restaurantId: body.restaurantId || (authSession.user as any).restaurantId,
      foodCourtId: body.foodCourtId,
      forceClose: body.forceClose ?? true,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Error al cerrar sesión' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
