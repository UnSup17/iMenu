/**
 * lib/reservations/preorder.ts
 * Utilidades para serialización, extracción y cálculo de platillos
 * pre-ordenados y estado de pre-pago en reservaciones.
 *
 * Almacena los datos estructurados en el campo de texto `Reservation.notes`
 * sin requerir migraciones de base de datos que bloqueen el proceso en desarrollo.
 */

export interface PreOrderItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

export interface PreOrderData {
  items: PreOrderItem[]
  totalAmount: number
  paymentStatus: 'UNPAID' | 'PREPAID'
  paymentMethod?: string // 'CARD' | 'STRIPE' | 'TRANSFER' | 'CASH'
  paymentReference?: string
  prepaidAt?: string
  customerNote?: string
}

const PREORDER_PREFIX = '[PREORDER:'
const PREORDER_SUFFIX = ']'

/**
 * Serializa un objeto PreOrderData dentro de las notas de la reservación.
 */
export function serializePreOrder(
  preOrder?: PreOrderData | null,
  baseNotes?: string | null
): string {
  const cleanBase = extractPreOrder(baseNotes).cleanNotes

  if (!preOrder || !preOrder.items || preOrder.items.length === 0) {
    return cleanBase
  }

  const jsonStr = JSON.stringify(preOrder)
  const tag = `[PREORDER:${jsonStr}]`

  return cleanBase ? `${tag}\n${cleanBase}` : tag
}

/**
 * Extrae y parsea el PreOrderData desde el campo de texto `notes`
 * soportando arrays anidados en JSON de forma segura.
 */
export function extractPreOrder(rawNotes: string | null | undefined): {
  preOrder: PreOrderData | null
  cleanNotes: string
} {
  if (!rawNotes) {
    return { preOrder: null, cleanNotes: '' }
  }

  const prefix = '[PREORDER:'
  const startIndex = rawNotes.indexOf(prefix)
  if (startIndex === -1) {
    return { preOrder: null, cleanNotes: rawNotes.trim() }
  }

  // Encontrar el inicio del objeto JSON '{'
  const jsonStart = rawNotes.indexOf('{', startIndex + prefix.length)
  if (jsonStart === -1) {
    return { preOrder: null, cleanNotes: rawNotes.trim() }
  }

  let depth = 0
  let jsonEnd = -1
  let inString = false
  let escape = false

  for (let i = jsonStart; i < rawNotes.length; i++) {
    const char = rawNotes[i]
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (!inString) {
      if (char === '{') depth++
      else if (char === '}') {
        depth--
        if (depth === 0) {
          jsonEnd = i
          break
        }
      }
    }
  }

  if (jsonEnd === -1) {
    return { preOrder: null, cleanNotes: rawNotes.trim() }
  }

  try {
    const jsonStr = rawNotes.slice(jsonStart, jsonEnd + 1)
    const parsed = JSON.parse(jsonStr) as PreOrderData

    // Encontrar el cierre de etiqueta ']' inmediatamente posterior a jsonEnd
    let tagEnd = jsonEnd + 1
    while (tagEnd < rawNotes.length && rawNotes[tagEnd] !== ']') {
      tagEnd++
    }
    if (tagEnd < rawNotes.length && rawNotes[tagEnd] === ']') {
      tagEnd++
    }

    const fullTag = rawNotes.slice(startIndex, tagEnd)
    const cleanNotes = rawNotes.replace(fullTag, '').trim()
    return { preOrder: parsed, cleanNotes }
  } catch (err) {
    console.warn('[extractPreOrder] Error parseando pre-orden de notas:', err)
    return { preOrder: null, cleanNotes: rawNotes.trim() }
  }
}

/**
 * Calcula el subtotal general de una lista de ítems de pre-orden.
 */
export function calculatePreOrderTotal(items: PreOrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.unitPrice), 0)
}
