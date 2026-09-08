import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { calculatePL, calculateVATSummary, calculateDailyCashRegister } from '@/lib/accounting/calculator'
import { prisma } from '@/lib/prisma'

export default async function AccountingHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { restaurantId?: string; role?: string }
  if (!user.restaurantId) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Restaurante no configurado.
      </div>
    )
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Consultamos datos en paralelo
  const [pl, vat, cashRegister, latestExpenses, lastClose] = await Promise.all([
    calculatePL(user.restaurantId, startOfMonth, endOfMonth, 'Mes Actual'),
    calculateVATSummary(user.restaurantId, startOfMonth, endOfMonth, 'Mes Actual'),
    calculateDailyCashRegister(user.restaurantId, now, 0),
    prisma.expense.findMany({
      where: { restaurantId: user.restaurantId },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.cashRegisterClose.findFirst({
      where: { restaurantId: user.restaurantId },
      orderBy: { date: 'desc' },
      include: { closedBy: { select: { name: true } } },
    }),
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Centro Contable y Financiero
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Resultados consolidados, control de gastos, arqueos de caja y obligaciones fiscales DIAN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/accounting/expenses"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            💸 Registrar Gasto
          </Link>
          <Link
            href="/dashboard/accounting/cash-register"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition"
          >
            🔒 Cierre de Caja
          </Link>
        </div>
      </div>

      {/* KPI Cards del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Netos */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Ventas Netas (Mes)
            </span>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-black text-white mt-2">
            ${pl.revenue.netSales.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {pl.revenue.invoicesCount} facturas pagadas este mes
          </p>
        </div>

        {/* Costo de Insumos (COGS) */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Costos de Insumos (COGS)
            </span>
            <span className="text-lg">🥩</span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">
            ${pl.costOfSales.totalCOGS.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Margen bruto: {pl.costOfSales.grossMarginPercent.toFixed(1)}%
          </p>
        </div>

        {/* Gastos Operativos (OPEX) */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Gastos Operativos (OPEX)
            </span>
            <span className="text-lg">📉</span>
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">
            ${pl.operatingExpenses.totalOpex.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Nómina, arriendo, servicios, etc.
          </p>
        </div>

        {/* Utilidad Operativa Neta */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Utilidad Neta del Mes
            </span>
            <span className="text-lg">🏆</span>
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              pl.netOperatingIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ${pl.netOperatingIncome.toLocaleString('es-CO')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Margen neto: {pl.netMarginPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Grid de Secciones: DIAN y Caja del Día */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Fiscal DIAN Colombia */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <h2 className="text-base font-bold text-white">
                Posición Fiscal de IVA (Colombia — DIAN)
              </h2>
            </div>
            <Link
              href="/dashboard/accounting/reports/vat"
              className="text-xs text-amber-400 hover:underline"
            >
              Ver Formulario 300 →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-500">IVA Generado en Ventas (19%)</span>
              <p className="text-lg font-bold text-zinc-200 mt-0.5">
                ${vat.vatCollected.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-500">IVA Descontable en Compras</span>
              <p className="text-lg font-bold text-zinc-200 mt-0.5">
                ${vat.vatPaid.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">Saldo Neto Estimado DIAN:</p>
              <p className="text-xs text-zinc-500">
                {vat.status === 'PAYABLE_TO_DIAN' ? 'Saldo a pagar a la DIAN' : 'Saldo a favor'}
              </p>
            </div>
            <span
              className={`text-xl font-black ${
                vat.status === 'PAYABLE_TO_DIAN' ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              ${Math.abs(vat.netVatBalance).toLocaleString('es-CO')}
            </span>
          </div>
        </div>

        {/* Widget Cierre de Caja del Día */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <h2 className="text-base font-bold text-white">
                Flujo de Caja del Día de Hoy
              </h2>
            </div>
            <Link
              href="/dashboard/accounting/cash-register"
              className="text-xs text-amber-400 hover:underline"
            >
              Historial de Arqueos →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-500">Total Ingresos Registrados Hoy</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                ${cashRegister.salesByMethod.total.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-500">Efectivo en Caja (Ventas)</span>
              <p className="text-lg font-bold text-amber-400 mt-0.5">
                ${cashRegister.salesByMethod.cash.toLocaleString('es-CO')}
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-400 flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/80">
            <span>Último cierre registrado:</span>
            <span className="text-zinc-300 font-semibold">
              {lastClose
                ? `${new Date(lastClose.date).toLocaleDateString('es-CO')} por ${
                    lastClose.closedBy.name || 'Admin'
                  }`
                : 'Sin cierres previos'}
            </span>
          </div>
        </div>
      </div>

      {/* Módulos de Acceso Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/accounting/reports/pl"
          className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 p-5 rounded-xl transition group"
        >
          <div className="text-2xl mb-2">📊</div>
          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
            Estado de Resultados (P&L)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Análisis detallado de márgenes de ganancia, costos fijos vs variables y rentabilidad.
          </p>
        </Link>

        <Link
          href="/dashboard/accounting/reports/vat"
          className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 p-5 rounded-xl transition group"
        >
          <div className="text-2xl mb-2">🏛️</div>
          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
            Declaración de IVA (DIAN)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Desglose de compras con IVA descontable vs facturas emitidas para contadores.
          </p>
        </Link>

        <Link
          href="/dashboard/accounting/periods"
          className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 p-5 rounded-xl transition group"
        >
          <div className="text-2xl mb-2">📅</div>
          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
            Períodos Contables
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Cierre formal mensual de libros contables para auditoría y archivo histórico.
          </p>
        </Link>
      </div>
    </div>
  )
}
