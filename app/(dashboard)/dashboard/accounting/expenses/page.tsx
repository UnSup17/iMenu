'use client'

import { useState, useEffect } from 'react'
import { ExpenseCategory } from '@prisma/client'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/accounting/calculator'
import { ExpenseForm } from '@/components/accounting/expense-form'

interface ExpenseItem {
  id: string
  category: ExpenseCategory
  description: string
  amount: string | number
  taxAmount: string | number
  supplier: string | null
  supplierTaxId: string | null
  receiptUrl: string | null
  date: string
  createdBy: {
    name: string | null
    email: string | null
  }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const url = selectedCategory !== 'ALL'
        ? `/api/accounting/expenses?category=${selectedCategory}`
        : '/api/accounting/expenses'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar gastos')
      const data = await res.json()
      setExpenses(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [selectedCategory])

  const filteredExpenses = expenses.filter((e) => {
    const term = search.toLowerCase()
    return (
      e.description.toLowerCase().includes(term) ||
      (e.supplier && e.supplier.toLowerCase().includes(term)) ||
      (e.supplierTaxId && e.supplierTaxId.includes(term))
    )
  })

  const totalAmount = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0)
  const totalTax = filteredExpenses.reduce((acc, e) => acc + Number(e.taxAmount), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Libro de Gastos y Compras
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Registro contable de costos operativos, insumos, servicios y facturas de proveedores.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition flex items-center gap-2"
        >
          <span>➕</span>
          <span>Nuevo Gasto</span>
        </button>
      </div>

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Total Gastos Filtrados
          </span>
          <p className="text-xl font-bold text-white mt-1">
            ${totalAmount.toLocaleString('es-CO')}
          </p>
          <span className="text-[11px] text-zinc-500">{filteredExpenses.length} registros</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            IVA Descontable (Soportado)
          </span>
          <p className="text-xl font-bold text-amber-400 mt-1">
            ${totalTax.toLocaleString('es-CO')}
          </p>
          <span className="text-[11px] text-zinc-500">Acreditable ante DIAN</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Base Gravable Neta
          </span>
          <p className="text-xl font-bold text-zinc-300 mt-1">
            ${(totalAmount - totalTax).toLocaleString('es-CO')}
          </p>
          <span className="text-[11px] text-zinc-500">Monto antes de IVA</span>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Buscar por descripción, proveedor o NIT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas las Categorías</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([catKey, label]) => (
              <option key={catKey} value={catKey}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Proveedor / NIT</th>
                <th className="px-4 py-3 text-right">IVA</th>
                <th className="px-4 py-3 text-right">Monto Total</th>
                <th className="px-4 py-3 text-center">Soporte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Cargando gastos contables...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No se encontraron gastos registrados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                        {EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {exp.supplier ? (
                        <div>
                          <p className="text-zinc-200">{exp.supplier}</p>
                          {exp.supplierTaxId && (
                            <p className="text-[10px] text-zinc-500">NIT: {exp.supplierTaxId}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-amber-400/90 whitespace-nowrap">
                      ${Number(exp.taxAmount).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">
                      ${Number(exp.amount).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-400 hover:underline"
                        >
                          Ver 📄
                        </a>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Gasto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>💸</span> Registrar Nuevo Gasto Contable
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <ExpenseForm
              onSuccess={() => {
                setShowModal(false)
                fetchExpenses()
              }}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
