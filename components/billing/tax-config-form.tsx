'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TaxConfigFormProps {
  initialData?: {
    country?: string
    currency?: string
    currencySymbol?: string
    vatRate?: { toString(): string } | number
    vatEnabled?: boolean
    serviceChargeRate?: { toString(): string } | number
    serviceChargeEnabled?: boolean
    legalName?: string | null
    taxId?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    invoicePrefix?: string
    invoiceFooter?: string | null
    ticketEnabled?: boolean
    ticketWidth?: number
    ticketHeader?: string | null
    ticketFooter?: string | null
    ticketShowLogo?: boolean
    ticketShowTax?: boolean
    ticketShowTable?: boolean
    ticketShowWaiter?: boolean
  } | null
}

export function TaxConfigForm({ initialData }: TaxConfigFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [country, setCountry] = useState(initialData?.country ?? 'CO')
  const [currency, setCurrency] = useState(initialData?.currency ?? 'COP')
  const [currencySymbol, setCurrencySymbol] = useState(initialData?.currencySymbol ?? '$')

  const initialVatRate = initialData?.vatRate
    ? (typeof initialData.vatRate === 'number'
        ? initialData.vatRate * 100
        : parseFloat(initialData.vatRate.toString()) * 100)
    : 19

  const [vatRate, setVatRate] = useState(initialVatRate.toString())
  const [vatEnabled, setVatEnabled] = useState(initialData?.vatEnabled ?? true)

  const initialServiceRate = initialData?.serviceChargeRate
    ? (typeof initialData.serviceChargeRate === 'number'
        ? initialData.serviceChargeRate * 100
        : parseFloat(initialData.serviceChargeRate.toString()) * 100)
    : 0

  const [serviceChargeRate, setServiceChargeRate] = useState(initialServiceRate.toString())
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(initialData?.serviceChargeEnabled ?? false)

  const [legalName, setLegalName] = useState(initialData?.legalName ?? '')
  const [taxId, setTaxId] = useState(initialData?.taxId ?? '')
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [website, setWebsite] = useState(initialData?.website ?? '')

  const [invoicePrefix, setInvoicePrefix] = useState(initialData?.invoicePrefix ?? 'FV')
  const [invoiceFooter, setInvoiceFooter] = useState(initialData?.invoiceFooter ?? '')

  const [ticketWidth, setTicketWidth] = useState<58 | 80>((initialData?.ticketWidth as 58 | 80) ?? 80)
  const [ticketHeader, setTicketHeader] = useState(initialData?.ticketHeader ?? '')
  const [ticketFooter, setTicketFooter] = useState(initialData?.ticketFooter ?? '')
  const [ticketShowTax, setTicketShowTax] = useState(initialData?.ticketShowTax ?? true)
  const [ticketShowTable, setTicketShowTable] = useState(initialData?.ticketShowTable ?? true)
  const [ticketShowWaiter, setTicketShowWaiter] = useState(initialData?.ticketShowWaiter ?? true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/billing/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          currency,
          currencySymbol,
          vatRate: (parseFloat(vatRate) || 0) / 100,
          vatEnabled,
          serviceChargeRate: (parseFloat(serviceChargeRate) || 0) / 100,
          serviceChargeEnabled,
          legalName: legalName.trim() || undefined,
          taxId: taxId.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          website: website.trim() || undefined,
          invoicePrefix: invoicePrefix.trim() || 'FV',
          invoiceFooter: invoiceFooter.trim() || undefined,
          ticketWidth,
          ticketHeader: ticketHeader.trim() || undefined,
          ticketFooter: ticketFooter.trim() || undefined,
          ticketShowTax,
          ticketShowTable,
          ticketShowWaiter,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar la configuración')
      }

      setMessage({ type: 'success', text: 'Configuración fiscal guardada correctamente' })
      router.refresh()
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-900 text-emerald-300'
              : 'bg-red-950/60 border border-red-900 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Región e Impuestos */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          País y Régimen Fiscal
        </h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">País *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="CO">Colombia (DIAN UBL 2.1)</option>
              <option value="MX">México (SAT CFDI 4.0)</option>
              <option value="CL">Chile (SII DTE)</option>
              <option value="PE">Perú (SUNAT)</option>
              <option value="OTHER">Otro País / Genérico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Moneda (ISO) *</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Símbolo *</label>
            <input
              type="text"
              required
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-400">Tarifa IVA (%)</label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="rounded border-zinc-800 text-amber-500 bg-zinc-950"
                />
                Activar IVA
              </label>
            </div>
            <input
              type="number"
              step="0.1"
              disabled={!vatEnabled}
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 disabled:opacity-50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-400">Propina Sugerida (%)</label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceChargeEnabled}
                  onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                  className="rounded border-zinc-800 text-amber-500 bg-zinc-950"
                />
                Activar
              </label>
            </div>
            <input
              type="number"
              step="0.1"
              disabled={!serviceChargeEnabled}
              value={serviceChargeRate}
              onChange={(e) => setServiceChargeRate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 disabled:opacity-50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Datos Legales del Negocio */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Datos Legales del Restaurante
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Razón Social</label>
            <input
              type="text"
              placeholder="Restaurante Gourmet S.A.S."
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">NIT / RFC / RUT</label>
            <input
              type="text"
              placeholder="900.123.456-7"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="Calle 123 #45-67"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Teléfono</label>
            <input
              type="text"
              placeholder="+57 300 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Prefijo Factura</label>
            <input
              type="text"
              placeholder="FV"
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Formato de Ticket POS */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Personalización de Impresión de Ticket (POS)
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Ancho de Impresora Térmica</label>
            <select
              value={ticketWidth}
              onChange={(e) => setTicketWidth(parseInt(e.target.value) as 58 | 80)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value={80}>80 mm (Estándar POS)</option>
              <option value={58}>58 mm (Portátil / Mini)</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ticketShowTable}
                onChange={(e) => setTicketShowTable(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 bg-zinc-950"
              />
              Mostrar Mesa
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={ticketShowWaiter}
                onChange={(e) => setTicketShowWaiter(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 bg-zinc-950"
              />
              Mostrar Mesero
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Mensaje en Encabezado de Ticket</label>
          <textarea
            rows={2}
            placeholder="Ej. ¡Bienvenido a Restaurante El Buen Sabor! Gracias por visitarnos."
            value={ticketHeader}
            onChange={(e) => setTicketHeader(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Pie de Página de Ticket</label>
          <textarea
            rows={2}
            placeholder="Ej. Propina voluntaria no incluida. Por favor revise su factura antes de salir."
            value={ticketFooter}
            onChange={(e) => setTicketFooter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
        >
          {loading ? 'Guardando...' : '💾 Guardar Configuración Fiscal'}
        </button>
      </div>
    </form>
  )
}
