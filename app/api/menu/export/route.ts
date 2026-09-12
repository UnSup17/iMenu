import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER']

async function getRestaurantId(userId: string, role: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { restaurantId: true, organizationId: true },
  })
  if (user?.restaurantId) return user.restaurantId
  if (user?.organizationId) {
    const first = await prisma.restaurant.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    })
    if (first) return first.id
  }
  if (role === 'SUPERADMIN') {
    const first = await prisma.restaurant.findFirst({ select: { id: true } })
    return first?.id ?? null
  }
  return null
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as { id: string; role: string }
    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const restaurantId = await getRestaurantId(user.id, user.role)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Sin restaurante asignado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const isTemplate = url.searchParams.get('template') === 'true'

    const headers = [
      'categoria',
      'nombre',
      'precio',
      'descripcion',
      'disponible',
      'alergenos',
      'precio_promocional',
      'dias_promocion',
      'hora_inicio_promocion',
      'hora_fin_promocion',
      'etiqueta_promocion',
      'imagen_url',
    ]

    let rows: string[][] = []

    if (isTemplate) {
      rows = [
        [
          'Hamburguesas & Sandwiches',
          'Hamburguesa Angus Trufada',
          '34900',
          '200g carne Angus certificada, queso gruyere fundido, cebolla caramelizada al oporto y mayonesa de trufa negra en pan brioche artesanal.',
          'true',
          'gluten,lacteos,huevos',
          '28900',
          '1,2,3,4,5',
          '17:00',
          '20:00',
          'Happy Hour 🍔',
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        ],
        [
          'Hamburguesas & Sandwiches',
          'Crispy Chicken Burger',
          '29500',
          'Pechuga de pollo crujiente marinada en suero de leche, ensalada de col agridulce, pepinillos encurtidos caseros y salsa tártara especiada.',
          'true',
          'gluten,lacteos,huevos,mostaza',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        [
          'Bebidas & Coctelería',
          'Gin Tonic Botánico Premium',
          '26000',
          'Ginebra artesanal infusionada con cardamomo, pepino fresco, bayas de enebro y tónica botánica mediterránea.',
          'true',
          '',
          '19900',
          '4,5,6',
          '16:00',
          '19:00',
          '2x1 After Office 🍸',
          '',
        ],
        [
          'Postres de Autor',
          'Volcán de Chocolate 70% & Helado',
          '21000',
          'Soufflé tibio de chocolate amargo de origen con centro líquido, acompañado de helado de vainilla bourbon de Madagascar y frutos rojos.',
          'true',
          'gluten,lacteos,huevos,frutos_secos',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      ]
    } else {
      const categories = await prisma.category.findMany({
        where: { restaurantId },
        orderBy: { orderIndex: 'asc' },
        include: {
          products: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      })

      for (const cat of categories) {
        for (const p of cat.products) {
          let allergensStr = ''
          if (p.allergens) {
            try {
              const parsed = JSON.parse(p.allergens)
              if (Array.isArray(parsed)) allergensStr = parsed.join(',')
              else allergensStr = p.allergens
            } catch {
              allergensStr = p.allergens
            }
          }

          let daysStr = ''
          if (p.scheduledPriceDays) {
            try {
              const parsed = JSON.parse(p.scheduledPriceDays)
              if (Array.isArray(parsed)) daysStr = parsed.join(',')
              else daysStr = p.scheduledPriceDays
            } catch {
              daysStr = p.scheduledPriceDays
            }
          }

          rows.push([
            cat.name,
            p.name,
            p.basePrice.toString(),
            p.description ?? '',
            p.isAvailable ? 'true' : 'false',
            allergensStr,
            p.scheduledPrice ? p.scheduledPrice.toString() : '',
            daysStr,
            p.scheduledPriceStart ?? '',
            p.scheduledPriceEnd ?? '',
            p.scheduledPriceLabel ?? '',
            p.imageUrl ?? '',
          ])
        }
      }
    }

    const csvContent =
      '\uFEFF' + // UTF-8 BOM para que Excel respete acentos en Windows/Mac
      headers.map(escapeCsv).join(',') +
      '\r\n' +
      rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')

    const filename = isTemplate
      ? 'plantilla_menu_imenu.csv'
      : `catalogo_menu_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/menu/export]', error)
    return NextResponse.json({ error: 'Error al exportar catálogo' }, { status: 500 })
  }
}
