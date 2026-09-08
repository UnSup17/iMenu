'use client'

import { useState } from 'react'
import { ExpenseCategory } from '@prisma/client'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/accounting/calculator'

interface ExpenseFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.FOOD_INGREDIENTS)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [hasVat, setHasVat] = useState(true)
  const [supplier, setSupplier] = useState('')
  const [supplierTaxId, setSupplierTaxId] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-calcular IVA 19% si se activa el toggle
  const handleAmountChange = (val: string) => {
    setAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && hasVat) {
      // Si el monto total incluye IVA 19%, la base es monto / 1.19 y el IVA es monto - base
      const vat = num - num / 1.19
      setTaxAmount(vat.toFixed(2))
    }
  }

  const handleVatToggle = (enabled: boolean) => {
    setHasVat(enabled)
    const num = parseFloat(amount)
    if (enabled && !isNaN(num)) {
      const vat = num - num / 1.19
      setTaxAmount(vat.toFixed(2))
    } else {
      setTaxAmount('0')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const numAmount = parseFloat(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Ingrese un monto válido mayor a 0')
      }

      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          amount: numAmount,
          taxAmount: parseFloat(taxAmount) || 0,
          supplier: supplier || null,
          supplierTaxId: supplierTaxId || null,
          receiptUrl: receiptUrl || null,
          date,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar el gasto')
      }

      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Error al procesar el formulario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-zinc-200">
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Categoría del Gasto *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            required
          >
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([catKey, label]) => (
              <option key={catKey} value={catKey}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Fecha del Comprobante *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          Descripción o Concepto *
        </label>
        <input
          type="text"
          placeholder="Ej: Factura #9823 Carne de res y pollo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Monto Total Pagado ($ COP) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400">
              IVA Descontable (19% DIAN)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVat}
                onChange={(e) => handleVatToggle(e.target.checked)}
                className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500"
              />
              <span>Incluye IVA</span>
            </label>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Proveedor / Razón Social
          </label>
          <input
            type="text"
            placeholder="Ej: Distribuidora Avícola S.A.S."
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            NIT / Identificación Fiscal
          </label>
          <input
            type="text"
            placeholder="Ej: 900.123.456-7"
            value={supplierTaxId}
            onChange={(e) => setSupplierTaxId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">
          URL de Comprobante / Factura Digital (Opcional)
        </label>
        <input
          type="url"
          placeholder="https://..."
          value={receiptUrl}
          onChange={(e) => setReceiptUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  )
}
