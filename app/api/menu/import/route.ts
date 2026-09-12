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

/**
 * Parser RFC-4180 robusto para CSV con comillas, saltos de línea y delimitadores escapados
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuote = false

  // Remover UTF-8 BOM si existe
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"'
        i++ // saltar quote escapado
      } else {
        insideQuote = !insideQuote
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++ // consumir \r\n
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  // Última celda / fila
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

export async function POST(req: NextRequest) {
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

    let csvContent = ''
    let autoCreateCategories = true

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const autoCreate = formData.get('autoCreateCategories')
      if (autoCreate !== null) {
        autoCreateCategories = autoCreate === 'true' || autoCreate === '1'
      }

      if (!file) {
        return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 })
      }
      csvContent = await file.text()
    } else {
      const json = await req.json()
      csvContent = json.csvText ?? ''
      if (json.autoCreateCategories !== undefined) {
        autoCreateCategories = Boolean(json.autoCreateCategories)
      }
    }

    if (!csvContent.trim()) {
      return NextResponse.json({ error: 'El contenido CSV está vacío' }, { status: 400 })
    }

    const parsedRows = parseCsv(csvContent)
    if (parsedRows.length < 2) {
      return NextResponse.json(
        { error: 'El archivo CSV debe contener al menos la cabecera y una fila de producto' },
        { status: 400 }
      )
    }

    const header = parsedRows[0].map((h) => h.toLowerCase().trim())
    const getCol = (name: string) => header.indexOf(name)

    const catIdx = getCol('categoria')
    const nameIdx = getCol('nombre')
    const priceIdx = getCol('precio')
    const descIdx = getCol('descripcion')
    const availIdx = getCol('disponible')
    const allergIdx = getCol('alergenos')
    const promoPriceIdx = getCol('precio_promocional')
    const promoDaysIdx = getCol('dias_promocion')
    const promoStartIdx = getCol('hora_inicio_promocion')
    const promoEndIdx = getCol('hora_fin_promocion')
    const promoLabelIdx = getCol('etiqueta_promocion')
    const imgIdx = getCol('imagen_url')

    if (catIdx === -1 || nameIdx === -1 || priceIdx === -1) {
      return NextResponse.json(
        {
          error:
            'Columnas requeridas faltantes en el CSV. Asegúrate de incluir: "categoria", "nombre" y "precio"',
        },
        { status: 400 }
      )
    }

    // Cachear categorías existentes del restaurante
    const existingCats = await prisma.category.findMany({
      where: { restaurantId },
      select: { id: true, name: true, orderIndex: true },
    })
    const categoryMap = new Map<string, string>()
    let maxOrderIndex = 0
    for (const c of existingCats) {
      categoryMap.set(c.name.trim().toLowerCase(), c.id)
      if (c.orderIndex > maxOrderIndex) maxOrderIndex = c.orderIndex
    }

    const dataRows = parsedRows.slice(1)
    const errors: { row: number; reason: string }[] = []
    let importedCount = 0
    let categoriesCreated = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2

      const rawCat = row[catIdx]?.trim()
      const rawName = row[nameIdx]?.trim()
      const rawPrice = row[priceIdx]?.trim()

      if (!rawCat || !rawName || !rawPrice) {
        errors.push({
          row: rowNumber,
          reason: 'Fila incompleta: requiere categoría, nombre y precio',
        })
        continue
      }

      const basePrice = parseFloat(rawPrice.replace(/[^\d.-]/g, ''))
      if (isNaN(basePrice) || basePrice < 0) {
        errors.push({
          row: rowNumber,
          reason: `Precio inválido: "${rawPrice}"`,
        })
        continue
      }

      // Buscar o crear categoría
      let categoryId = categoryMap.get(rawCat.toLowerCase())
      if (!categoryId) {
        if (!autoCreateCategories) {
          errors.push({
            row: rowNumber,
            reason: `La categoría "${rawCat}" no existe y la creación automática está desactivada`,
          })
          continue
        }

        maxOrderIndex++
        const newCat = await prisma.category.create({
          data: {
            restaurantId,
            name: rawCat,
            orderIndex: maxOrderIndex,
            isActive: true,
          },
        })
        categoryId = newCat.id
        categoryMap.set(rawCat.toLowerCase(), newCat.id)
        categoriesCreated++
      }

      const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : null

      let isAvailable = true
      if (availIdx !== -1 && row[availIdx]) {
        const v = row[availIdx].toLowerCase().trim()
        isAvailable = v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes'
      }

      // Alérgenos: separar por coma
      let allergensJson: string | null = null
      if (allergIdx !== -1 && row[allergIdx]?.trim()) {
        const list = row[allergIdx]
          .split(',')
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
        if (list.length > 0) {
          allergensJson = JSON.stringify(list)
        }
      }

      // Precio promocional
      let scheduledPrice: number | null = null
      if (promoPriceIdx !== -1 && row[promoPriceIdx]?.trim()) {
        const sp = parseFloat(row[promoPriceIdx].replace(/[^\d.-]/g, ''))
        if (!isNaN(sp) && sp > 0) scheduledPrice = sp
      }

      let scheduledPriceDays: string | null = null
      if (promoDaysIdx !== -1 && row[promoDaysIdx]?.trim()) {
        const days = row[promoDaysIdx]
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d) && d >= 0 && d <= 6)
        if (days.length > 0) {
          scheduledPriceDays = JSON.stringify(days)
        }
      }

      const scheduledPriceStart =
        promoStartIdx !== -1 && row[promoStartIdx]?.trim() ? row[promoStartIdx].trim() : null
      const scheduledPriceEnd =
        promoEndIdx !== -1 && row[promoEndIdx]?.trim() ? row[promoEndIdx].trim() : null
      const scheduledPriceLabel =
        promoLabelIdx !== -1 && row[promoLabelIdx]?.trim() ? row[promoLabelIdx].trim() : null
      const imageUrl = imgIdx !== -1 && row[imgIdx]?.trim() ? row[imgIdx].trim() : null

      // Buscar si ya existe producto con este nombre en la misma categoría
      const existingProduct = await prisma.product.findFirst({
        where: {
          restaurantId,
          categoryId,
          name: rawName,
        },
      })

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            basePrice,
            description: description ?? existingProduct.description,
            isAvailable,
            ...(allergensJson && { allergens: allergensJson }),
            ...(scheduledPrice !== null && { scheduledPrice }),
            ...(scheduledPriceDays && { scheduledPriceDays }),
            ...(scheduledPriceStart && { scheduledPriceStart }),
            ...(scheduledPriceEnd && { scheduledPriceEnd }),
            ...(scheduledPriceLabel && { scheduledPriceLabel }),
            ...(imageUrl && { imageUrl }),
          },
        })
      } else {
        await prisma.product.create({
          data: {
            restaurantId,
            categoryId,
            name: rawName,
            description,
            basePrice,
            isAvailable,
            allergens: allergensJson,
            scheduledPrice,
            scheduledPriceDays,
            scheduledPriceStart,
            scheduledPriceEnd,
            scheduledPriceLabel,
            imageUrl,
          },
        })
      }

      importedCount++
    }

    return NextResponse.json({
      success: true,
      importedCount,
      categoriesCreated,
      totalRows: dataRows.length,
      errors,
    })
  } catch (error) {
    console.error('[POST /api/menu/import]', error)
    return NextResponse.json({ error: 'Error al procesar la importación' }, { status: 500 })
  }
}
