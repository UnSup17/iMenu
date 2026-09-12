'use client'

import { useState } from 'react'

interface WhatsAppInvoiceButtonProps {
  invoiceId: string
  invoiceNumber: string
  restaurantName: string
  totalAmount: number
  customerName?: string | null
  customerPhone?: string | null
  itemsSummary: { name: string; quantity: number; subtotal: number }[]
}

export function WhatsAppInvoiceButton({
  invoiceId,
  invoiceNumber,
  restaurantName,
  totalAmount,
  customerName,
  customerPhone: initialPhone,
  itemsSummary,
}: WhatsAppInvoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phone, setPhone] = useState(initialPhone || '')
  const [countryCode, setCountryCode] = useState('57') // Default Colombia +57

  const generateWhatsAppMessage = () => {
    const formattedTotal = totalAmount.toLocaleString('es-CO')
    const customer = customerName ? ` para ${customerName}` : ''
    
    // Items breakdown (max 5)
    const itemsText = itemsSummary
      .slice(0, 5)
      .map((i) => `• ${i.quantity}x ${i.name} ($${i.subtotal.toLocaleString('es-CO')})`)
      .join('\n')
    const moreItems = itemsSummary.length > 5 ? `\n... y ${itemsSummary.length - 5} ítem(s) más` : ''

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const receiptLink = `${origin}/dashboard/billing/invoices/${invoiceId}`

    const msg = `🧾 *Factura Electrónica / Comprobante*\n` +
      `🏢 *${restaurantName}*\n\n` +
      `Hola${customer}! Aquí tienes el detalle de tu factura *N° ${invoiceNumber}*:\n\n` +
      `${itemsText}${moreItems}\n\n` +
      `💰 *Total:* $${formattedTotal} COP\n\n` +
      `🔗 Puedes consultar o descargar tu comprobante digital aquí:\n${receiptLink}\n\n` +
      `¡Muchas gracias por tu visita y preferencia! ✨`

    return msg
  }

  const handleSendWhatsApp = () => {
    const cleanNumber = phone.replace(/[^0-9]/g, '')
    if (!cleanNumber) {
      alert('Por favor ingresa un número de teléfono válido.')
      return
    }

    const fullPhone = cleanNumber.startsWith(countryCode)
      ? cleanNumber
      : `${countryCode}${cleanNumber}`

    const message = generateWhatsAppMessage()
    const encoded = encodeURIComponent(message)
    const waUrl = `https://wa.me/${fullPhone}?text=${encoded}`

    window.open(waUrl, '_blank')
    setIsOpen(false)
  }

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const receiptLink = `${origin}/dashboard/billing/invoices/${invoiceId}`
    navigator.clipboard.writeText(receiptLink)
    alert('¡Enlace de la factura copiado al portapapeles!')
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
        title="Enviar factura por WhatsApp"
      >
        <span>💬</span>
        <span>Enviar por WhatsApp</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💬</span>
                <div>
                  <h3 className="text-base font-bold text-white">Enviar Factura por WhatsApp</h3>
                  <p className="text-xs text-zinc-400 font-mono">Factura N° {invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Número de WhatsApp del Cliente
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-xs rounded-xl px-2.5 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="57">🇨🇴 +57 (Colombia)</option>
                    <option value="52">🇲🇽 +52 (México)</option>
                    <option value="1">🇺🇸 +1 (USA)</option>
                    <option value="34">🇪🇸 +34 (España)</option>
                    <option value="54">🇦🇷 +54 (Argentina)</option>
                    <option value="56">🇨🇱 +56 (Chile)</option>
                    <option value="51">🇵🇪 +51 (Perú)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Ej. 3101234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Vista previa del mensaje */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 text-xs space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Vista previa del mensaje
                </p>
                <div className="text-zinc-300 whitespace-pre-wrap font-sans text-[11px] max-h-36 overflow-y-auto bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
                  {generateWhatsAppMessage()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                📋 Copiar Link
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Abrir WhatsApp</span>
                  <span>🚀</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
