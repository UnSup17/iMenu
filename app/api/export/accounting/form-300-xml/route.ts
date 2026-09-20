import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateVATSummary } from '@/lib/accounting/calculator'
import { buildDianForm300Xml } from '@/lib/accounting/dian-form300-builder'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { restaurantId?: string; role?: string }
    if (!user.restaurantId) {
      return NextResponse.json({ error: 'Restaurante no configurado' }, { status: 400 })
    }

    const allowed = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT']
    if (!allowed.includes(user.role || '')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const monthParam = searchParams.get('month') // YYYY-MM
    const bimonthlyParam = searchParams.get('bimonthly') // 1 to 6
    const yearParam = searchParams.get('year') // YYYY

    let startDate: Date
    let endDate: Date
    let periodYear = new Date().getFullYear()
    let bimonthlyPeriod = 1

    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number)
      periodYear = year
      bimonthlyPeriod = Math.ceil(month / 2) // e.g. 9 -> 5
      // Compute dates for the full bimestre
      const startMonth = (bimonthlyPeriod - 1) * 2
      startDate = new Date(year, startMonth, 1)
      endDate = new Date(year, startMonth + 2, 0, 23, 59, 59, 999)
    } else if (bimonthlyParam && yearParam) {
      periodYear = Number(yearParam)
      bimonthlyPeriod = Number(bimonthlyParam)
      const startMonth = (bimonthlyPeriod - 1) * 2
      startDate = new Date(periodYear, startMonth, 1)
      endDate = new Date(periodYear, startMonth + 2, 0, 23, 59, 59, 999)
    } else {
      // Current bimestre
      const now = new Date()
      periodYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      bimonthlyPeriod = Math.ceil(currentMonth / 2)
      const startMonth = (bimonthlyPeriod - 1) * 2
      startDate = new Date(periodYear, startMonth, 1)
      endDate = new Date(periodYear, startMonth + 2, 0, 23, 59, 59, 999)
    }

    // Retrieve restaurant and tax config info
    const [restaurant, taxConfig] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id: user.restaurantId },
        select: { name: true },
      }),
      prisma.taxConfig.findUnique({
        where: { restaurantId: user.restaurantId },
      }),
    ])

    const vatData = await calculateVATSummary(
      user.restaurantId,
      startDate,
      endDate,
      `Bimestre ${bimonthlyPeriod} (${periodYear})`
    )

    const restaurantMeta = {
      name: taxConfig?.legalName || restaurant?.name || 'Restaurante',
      taxId: taxConfig?.taxId || null,
      dv: '1',
    }

    const xmlContent = buildDianForm300Xml(vatData, restaurantMeta, periodYear, bimonthlyPeriod)

    const filename = `DIAN_Formulario_300_${periodYear}_Bimestre_${bimonthlyPeriod}.xml`

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[DIAN Formulario 300 XML Export Error]:', error)
    return NextResponse.json(
      { error: 'Error al generar archivo XML de Formulario 300 DIAN' },
      { status: 500 }
    )
  }
}
