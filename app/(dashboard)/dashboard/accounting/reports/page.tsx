import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = {
  title: 'Hub de Reportes Contables | iMenu',
  description: 'Accede a todos los reportes financieros: P&L, IVA, Flujo de Caja y más.',
}

const REPORTS = [
  {
    href: '/dashboard/accounting/reports/pl',
    icon: '📊',
    title: 'P&L — Pérdidas y Ganancias',
    description: 'Estado de resultados mensual: ingresos, costos, gastos operativos y utilidad neta.',
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400',
    badge: 'Disponible',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    href: '/dashboard/accounting/reports/vat',
    icon: '🧾',
    title: 'IVA — Declaración de Impuestos',
    description: 'Resumen de IVA recaudado y descontable por período fiscal para presentación ante la DIAN.',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-400',
    badge: 'Disponible',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    href: '/dashboard/accounting/reports/cashflow',
    icon: '💧',
    title: 'Flujo de Caja (Cashflow)',
    description: 'Entradas y salidas de efectivo en el período: cobros, pagos a proveedores, nómina y saldo neto.',
    color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 hover:border-cyan-400',
    badge: 'Próximamente',
    badgeColor: 'bg-zinc-700/60 text-zinc-400 border-zinc-600',
  },
  {
    href: '/dashboard/accounting/periods',
    icon: '📅',
    title: 'Períodos Contables',
    description: 'Gestión de cierres mensuales y anuales. Bloquea períodos ya reportados para evitar modificaciones.',
    color: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 hover:border-violet-400',
    badge: 'Disponible',
    badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
  {
    href: '/dashboard/accounting/expenses',
    icon: '💸',
    title: 'Gastos y Egresos',
    description: 'Registro y categorización de gastos operativos: arriendo, nómina, servicios y más.',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-400',
    badge: 'Disponible',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    href: '/dashboard/accounting/cash-register',
    icon: '🏧',
    title: 'Caja Registradora',
    description: 'Arqueo diario, cierres de caja, diferencias y cuadre por método de pago.',
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 hover:border-rose-400',
    badge: 'Disponible',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
]

export default async function AccountingReportsHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { role?: string }
  const allowedRoles = ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ADMIN', 'ACCOUNTANT']
  if (!allowedRoles.includes(user.role || '')) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/dashboard/accounting"
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Hub de Reportes Contables</h1>
            <p className="text-xs text-zinc-500">Selecciona el reporte que deseas consultar o exportar</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 p-6 sm:p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                📈
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Informes Financieros</h2>
                <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                  Todos tus reportes contables en un solo lugar. Analiza rentabilidad, cumplimiento tributario,
                  flujo de efectivo y cierres de caja con datos en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Reportes disponibles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORTS.map((report) => (
              <Link
                key={report.href}
                href={report.href}
                className={`group relative rounded-2xl border bg-gradient-to-br ${report.color} p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 flex flex-col gap-3`}
              >
                {/* Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{report.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${report.badgeColor}`}>
                    {report.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm leading-tight group-hover:text-white">
                    {report.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-between text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors pt-1 border-t border-white/5">
                  <span>Ver reporte</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Acciones rápidas</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/accounting/reports/pl"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-2"
            >
              <span>📊</span> Ver P&L del mes actual
            </Link>
            <Link
              href="/dashboard/accounting/reports/vat"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-2"
            >
              <span>🧾</span> Ver declaración de IVA
            </Link>
            <Link
              href="/dashboard/accounting"
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors flex items-center gap-2"
            >
              <span>←</span> Volver al módulo contable
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
