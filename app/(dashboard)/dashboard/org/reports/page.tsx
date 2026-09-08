'use client'

import { useState, useEffect } from 'react'

interface OrgReportData {
  period: string
  summary: {
    branchesCount: number
    totalRevenue: number
    totalTaxCollected: number
    totalSales: number
    totalInvoices: number
    totalOrders: number
  }
  branchBreakdown: {
    id: string
    name: string
    slug: string
    invoicesCount: number
    ordersCount: number
    revenue: number
    taxCollected: number
    totalSales: number
  }[]
}

export default function OrgReportsPage() {
  const [data, setData] = useState<OrgReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/org/reports')
      if (!res.ok) throw new Error('Error al cargar reporte consolidado')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reportes Consolidados de Franquicia
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Métricas acumuladas de facturación, ventas e impuestos entre todas las sedes de la organización.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          🖨️ Imprimir Consolidado
        </button>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800">
          Consolidando datos de todas las sucursales...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Total Ventas Consolidadas</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                ${data.summary.totalSales.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">{data.summary.branchesCount} sucursales</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Ingresos Netos (Subtotal)</span>
              <p className="text-2xl font-black text-white mt-1">
                ${data.summary.totalRevenue.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">Base antes de IVA</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">IVA Total Recaudado</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                ${data.summary.totalTaxCollected.toLocaleString('es-CO')}
              </p>
              <span className="text-[11px] text-zinc-500">Obligación DIAN</span>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-xl">
              <span className="text-xs text-zinc-500 uppercase font-semibold">Facturas Pagadas</span>
              <p className="text-2xl font-black text-blue-400 mt-1">
                {data.summary.totalInvoices}
              </p>
              <span className="text-[11px] text-zinc-500">{data.summary.totalOrders} pedidos totales</span>
            </div>
          </div>

          {/* Tabla Comparativa de Sucursales */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white">
                Rendimiento Comparativo por Sucursal ({data.period})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Sucursal</th>
                    <th className="px-4 py-3 text-center">Pedidos</th>
                    <th className="px-4 py-3 text-center">Facturas Pagadas</th>
                    <th className="px-4 py-3 text-right">Venta Neta</th>
                    <th className="px-4 py-3 text-right">IVA Recaudado</th>
                    <th className="px-4 py-3 text-right">Total Facturado</th>
                    <th className="px-4 py-3 text-right">% Aporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.branchBreakdown.map((b) => {
                    const share =
                      data.summary.totalSales > 0
                        ? ((b.totalSales / data.summary.totalSales) * 100).toFixed(1)
                        : '0'
                    return (
                      <tr key={b.id} className="hover:bg-zinc-800/40 transition">
                        <td className="px-4 py-3 font-bold text-white">
                          <div>{b.name}</div>
                          <span className="text-[11px] text-zinc-500 font-mono">/{b.slug}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-zinc-300">
                          {b.ordersCount}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-zinc-300">
                          {b.invoicesCount}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-200">
                          ${b.revenue.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400/90 text-xs">
                          ${b.taxCollected.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">
                          ${b.totalSales.toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-zinc-300">
                          {share}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
