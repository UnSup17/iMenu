/**
 * Tipos y utilidades para Variantes de Tamaño con Precios Escalonados Directos
 */

export interface ProductSizeVariant {
  id: string
  name: string // ej: "Pequeño", "Mediano", "Grande", "Familiar", "Personal"
  price: number // Precio escalonado directo
  isDefault?: boolean
}

/**
 * Parsea el campo de texto/JSON `sizes` de la base de datos a un array de variantes tipadas.
 */
export function parseProductSizes(
  raw: string | ProductSizeVariant[] | any[] | null | undefined
): ProductSizeVariant[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item && typeof item === 'object' && typeof item.name === 'string')
      .map((item, index) => ({
        id: item.id || `size_${index + 1}`,
        name: String(item.name).trim(),
        price: Number(item.price) || 0,
        isDefault: Boolean(item.isDefault),
      }))
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object' && typeof item.name === 'string')
      .map((item, index) => ({
        id: item.id || `size_${index + 1}`,
        name: String(item.name).trim(),
        price: Number(item.price) || 0,
        isDefault: Boolean(item.isDefault),
      }))
  } catch {
    return []
  }
}

/**
 * Serializa un array de variantes de tamaño a JSON string para persistencia en base de datos.
 */
export function serializeProductSizes(
  sizes: (ProductSizeVariant | { id?: string; name: string; price: number; isDefault?: boolean })[] | null | undefined
): string | null {
  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) return null
  const valid: ProductSizeVariant[] = sizes
    .filter((s) => s && s.name && s.name.trim().length > 0)
    .map((s, idx) => ({
      id: s.id || `size_${idx + 1}`,
      name: s.name.trim(),
      price: Math.max(0, Number(s.price) || 0),
      isDefault: Boolean(s.isDefault),
    }))

  if (valid.length === 0) return null
  // Asegurar que al menos uno sea default si no hay ninguno marcado
  if (!valid.some((s) => s.isDefault)) {
    valid[0].isDefault = true
  }
  return JSON.stringify(valid)
}

/**
 * Obtiene el precio aplicable de un producto según el tamaño seleccionado.
 */
export function getProductPriceForSize(
  basePrice: number,
  sizes: ProductSizeVariant[],
  selectedSizeIdOrName?: string
): { price: number; selectedSize: ProductSizeVariant | null } {
  if (!sizes || sizes.length === 0) {
    return { price: basePrice, selectedSize: null }
  }

  if (selectedSizeIdOrName) {
    const found = sizes.find(
      (s) => s.id === selectedSizeIdOrName || s.name.toLowerCase() === selectedSizeIdOrName.toLowerCase()
    )
    if (found) {
      return { price: found.price, selectedSize: found }
    }
  }

  // Fallback al default o al primero
  const def = sizes.find((s) => s.isDefault) || sizes[0]
  return { price: def.price, selectedSize: def }
}

/**
 * Obtiene el tamaño por defecto si existe
 */
export function getDefaultSize(sizes: ProductSizeVariant[]): ProductSizeVariant | null {
  if (!sizes || sizes.length === 0) return null
  return sizes.find((s) => s.isDefault) || sizes[0] || null
}
