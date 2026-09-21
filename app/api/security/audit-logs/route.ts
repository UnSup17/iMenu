import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRecentAuditLogs } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as {
      id?: string
      role?: string
      organizationId?: string | null
      restaurantId?: string | null
    }

    let orgId = user.organizationId
    if (!orgId && user.restaurantId) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        select: { organizationId: true },
      })
      orgId = rest?.organizationId || null
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100)

    const logs = await getRecentAuditLogs({
      organizationId: orgId,
      restaurantId: user.restaurantId,
      userId: user.role === 'SUPERADMIN' ? undefined : user.id,
      limit,
    })

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error('[GET /api/security/audit-logs]', error)
    return NextResponse.json({ error: 'Error al consultar logs de auditoría' }, { status: 500 })
  }
}
