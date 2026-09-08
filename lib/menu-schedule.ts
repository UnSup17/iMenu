/**
 * lib/menu-schedule.ts
 *
 * Lógica para determinar si una categoría de "oferta especial" está activa
 * en un momento dado. Se ejecuta en el servidor (sin dependencias de cliente).
 */

export interface ScheduledCategory {
  isSpecialOffer: boolean
  offerStartDate: Date | null
  offerEndDate: Date | null
  /** JSON string "[0,1,2,3,4,5,6]" — 0=Dom, 1=Lun … 6=Sáb */
  offerActiveDays: string | null
  /** "HH:MM" 24h */
  offerStartTime: string | null
  /** "HH:MM" 24h */
  offerEndTime: string | null
}

/**
 * Retorna true si la categoría debe mostrarse ahora.
 *
 * Reglas:
 * - Si `isSpecialOffer` es false → siempre visible (categoría regular).
 * - Si `isSpecialOffer` es true → se evalúan fecha, días y hora:
 *   - `offerStartDate` / `offerEndDate` → la fecha actual (UTC day) debe estar dentro del rango.
 *     null en cualquiera de los extremos = sin límite en ese lado.
 *   - `offerActiveDays` → si se define, el día de semana actual debe estar en la lista.
 *   - `offerStartTime` / `offerEndTime` → la hora actual debe estar dentro del rango.
 *     null = sin restricción de hora.
 */
export function isCategoryScheduleActive(
  category: ScheduledCategory,
  now: Date = new Date(),
): boolean {
  if (!category.isSpecialOffer) return true

  // Comparamos usando medianoche UTC como fecha del día
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  // ── Rango de fechas ────────────────────────────────────────────────────────
  if (category.offerStartDate) {
    const start = new Date(category.offerStartDate)
    const startDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    if (todayUTC < startDay) return false
  }

  if (category.offerEndDate) {
    const end = new Date(category.offerEndDate)
    const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
    if (todayUTC > endDay) return false
  }

  // ── Días de la semana ──────────────────────────────────────────────────────
  if (category.offerActiveDays) {
    try {
      const days: number[] = JSON.parse(category.offerActiveDays)
      const todayDow = now.getUTCDay() // 0=Dom … 6=Sáb
      if (!days.includes(todayDow)) return false
    } catch {
      // JSON malformado — ignorar restricción de días
    }
  }

  // ── Rango de horas ─────────────────────────────────────────────────────────
  if (category.offerStartTime || category.offerEndTime) {
    const hh = now.getUTCHours()
    const mm = now.getUTCMinutes()
    const currentMinutes = hh * 60 + mm

    if (category.offerStartTime) {
      const [sh, sm] = category.offerStartTime.split(':').map(Number)
      if (currentMinutes < sh * 60 + sm) return false
    }

    if (category.offerEndTime) {
      const [eh, em] = category.offerEndTime.split(':').map(Number)
      if (currentMinutes >= eh * 60 + em) return false
    }
  }

  return true
}
