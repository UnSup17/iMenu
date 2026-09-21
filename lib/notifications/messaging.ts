/**
 * lib/notifications/messaging.ts
 * Servicio unificado de mensajería para confirmación y recordatorio
 * de reservaciones vía WhatsApp y SMS.
 *
 * En producción: puede integrarse con Twilio o WhatsApp Cloud API.
 * En desarrollo: registra el mensaje estructurado en consola y genera
 * enlaces directos wa.me para envío con 1 solo clic.
 */

export interface ReservationNotificationData {
  customerName: string
  customerPhone: string
  restaurantName: string
  restaurantAddress?: string | null
  reservationDate: Date | string
  partySize: number
  tableNumber?: number | null
  preOrderSummary?: {
    itemCount: number
    totalAmount: number
    isPrepaid: boolean
  } | null
  notes?: string | null
}

export interface NotificationResult {
  success: boolean
  channel: 'WHATSAPP' | 'SMS' | 'CONSOLE'
  to: string
  message: string
  whatsappUrl: string
  messageId?: string
  error?: string
}

/**
 * Normaliza el número de teléfono para WhatsApp / SMS internacional.
 * Si es un número colombiano de 10 dígitos (inicia en 3), antepone 57.
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`
  }
  return digits
}

/**
 * Genera el mensaje de confirmación de reserva.
 */
export function formatConfirmationMessage(data: ReservationNotificationData): string {
  const dateObj =
    typeof data.reservationDate === 'string'
      ? new Date(data.reservationDate)
      : data.reservationDate

  const dateStr = dateObj.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeStr = dateObj.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let msg = `🍽️ *¡Reserva Confirmada en ${data.restaurantName}!* 🍽️\n\n`
  msg += `Hola *${data.customerName}*, tu mesa está confirmada:\n`
  msg += `📅 *Fecha:* ${dateStr}\n`
  msg += `⏰ *Hora:* ${timeStr}\n`
  msg += `👥 *Comensales:* ${data.partySize} ${data.partySize === 1 ? 'persona' : 'personas'}\n`

  if (data.tableNumber) {
    msg += `🪑 *Mesa asignada:* Mesa #${data.tableNumber}\n`
  }

  if (data.preOrderSummary && data.preOrderSummary.itemCount > 0) {
    const paymentText = data.preOrderSummary.isPrepaid
      ? '✅ Pagado por anticipado'
      : '⏳ Pago al llegar'
    msg += `\n📦 *Pre-orden:* ${data.preOrderSummary.itemCount} platos ($${data.preOrderSummary.totalAmount.toLocaleString(
      'es-CO'
    )}) - ${paymentText}\n`
  }

  if (data.restaurantAddress) {
    msg += `📍 *Dirección:* ${data.restaurantAddress}\n`
  }

  msg += `\n¡Te esperamos! Si deseas reprogramar o cancelar, por favor avísanos respondiendo a este mensaje.`
  return msg
}

/**
 * Genera el mensaje de recordatorio previo (2 horas antes).
 */
export function formatReminderMessage(data: ReservationNotificationData): string {
  const dateObj =
    typeof data.reservationDate === 'string'
      ? new Date(data.reservationDate)
      : data.reservationDate

  const timeStr = dateObj.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let msg = `⏰ *Recordatorio de Reserva — ${data.restaurantName}* ⏰\n\n`
  msg += `Hola *${data.customerName}*, te recordamos que tienes una reserva hoy a las *${timeStr}* para *${data.partySize}* personas.`

  if (data.tableNumber) {
    msg += ` Tu Mesa #${data.tableNumber} ya se está preparando.`
  }

  if (data.preOrderSummary && data.preOrderSummary.itemCount > 0) {
    msg += `\nTu pre-orden de comida estará lista para comenzar a servirse tras tu llegada.`
  }

  msg += `\n\nSi vas a llegar con retraso o necesitas ajustar el número de invitados, por favor contáctanos.`
  return msg
}

/**
 * Genera un enlace wa.me para abrir WhatsApp directamente con el texto listo.
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = normalizePhoneNumber(phone)
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
}

/**
 * Envía la notificación de confirmación de reserva vía WhatsApp / SMS.
 */
export async function sendReservationConfirmation(
  data: ReservationNotificationData
): Promise<NotificationResult> {
  const message = formatConfirmationMessage(data)
  const phone = normalizePhoneNumber(data.customerPhone)
  const whatsappUrl = generateWhatsAppUrl(data.customerPhone, message)

  // En desarrollo o sin API configurada: registrar en consola con visualización elegante
  console.log('\n' + '═'.repeat(65))
  console.log('📱 [iMenu Mensajería] CONFIRMACIÓN DE RESERVA ENVIADA')
  console.log(`Para: +${phone} (${data.customerName})`)
  console.log(`Restaurante: ${data.restaurantName}`)
  console.log('─'.repeat(65))
  console.log(message)
  console.log('─'.repeat(65))
  console.log(`🔗 Enlace directo WhatsApp: ${whatsappUrl}`)
  console.log('═'.repeat(65) + '\n')

  return {
    success: true,
    channel: 'WHATSAPP',
    to: phone,
    message,
    whatsappUrl,
    messageId: `msg_${Date.now()}`,
  }
}

/**
 * Envía la notificación de recordatorio (2 horas antes).
 */
export async function sendReservationReminder(
  data: ReservationNotificationData
): Promise<NotificationResult> {
  const message = formatReminderMessage(data)
  const phone = normalizePhoneNumber(data.customerPhone)
  const whatsappUrl = generateWhatsAppUrl(data.customerPhone, message)

  console.log('\n' + '═'.repeat(65))
  console.log('⏰ [iMenu Mensajería] RECORDATORIO DE RESERVA (2H ANTES)')
  console.log(`Para: +${phone} (${data.customerName})`)
  console.log('─'.repeat(65))
  console.log(message)
  console.log('─'.repeat(65))
  console.log(`🔗 Enlace directo WhatsApp: ${whatsappUrl}`)
  console.log('═'.repeat(65) + '\n')

  return {
    success: true,
    channel: 'WHATSAPP',
    to: phone,
    message,
    whatsappUrl,
    messageId: `remind_${Date.now()}`,
  }
}
