import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

const NAV_SECTIONS = [
  {
    label: 'Operaciones',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'],
    items: [
      { href: '/dashboard', label: 'Inicio', icon: '🏠' },
      { href: '/dashboard/menu', label: 'Gestor de Menú', icon: '🍽️' },
      { href: '/dashboard/orders', label: 'Pedidos', icon: '📋' },
      { href: '/dashboard/tables', label: 'Mesas', icon: '🪑' },
    ],
  },
  {
    label: 'Inventario',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'],
    items: [
      { href: '/dashboard/inventory', label: 'Existencias', icon: '📦' },
      { href: '/dashboard/inventory/recipes', label: 'Recetas', icon: '🍳' },
      { href: '/dashboard/inventory/movements', label: 'Movimientos', icon: '📊' },
    ],
  },
  {
    label: 'Facturación',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAITER'],
    items: [
      { href: '/dashboard/billing', label: 'Resumen del día', icon: '💰' },
      { href: '/dashboard/billing/invoices', label: 'Facturas', icon: '🧾' },
      { href: '/dashboard/billing/config', label: 'Configuración', icon: '⚙️', adminOnly: true },
    ],
  },
  {
    label: 'Contabilidad',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER'],
    items: [
      { href: '/dashboard/accounting', label: 'Resumen Contable', icon: '📈' },
      { href: '/dashboard/accounting/expenses', label: 'Gastos', icon: '💸' },
      { href: '/dashboard/accounting/cash-register', label: 'Cierre de Caja', icon: '🔒' },
      { href: '/dashboard/accounting/reports/pl', label: 'Estado P&L', icon: '📊' },
      { href: '/dashboard/accounting/reports/vat', label: 'Reporte IVA (DIAN)', icon: '🏛️' },
      { href: '/dashboard/accounting/periods', label: 'Períodos', icon: '📅', adminOnly: true },
    ],
  },
  {
    label: 'Franquicia',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'],
    items: [
      { href: '/dashboard/org', label: 'Hub Franquicia', icon: '🏢' },
      { href: '/dashboard/org/branches', label: 'Sucursales', icon: '📍' },
      { href: '/dashboard/org/reports', label: 'Reportes Cadena', icon: '📊' },
    ],
  },
  {
    label: 'Superadmin',
    roles: ['SUPERADMIN'],
    items: [
      { href: '/dashboard/superadmin', label: 'Métricas Globales', icon: '⚡' },
      { href: '/dashboard/superadmin/organizations', label: 'Clientes SaaS', icon: '👥' },
    ],
  },
  {
    label: 'Inteligencia & Analytics',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'ACCOUNTANT', 'MANAGER'],
    items: [
      { href: '/dashboard/analytics', label: 'Analytics & ABC', icon: '📊' },
    ],
  },
  {
    label: 'Configuración',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'],
    items: [
      { href: '/dashboard/settings/electronic-invoicing', label: 'Factura DIAN (UBL 2.1)', icon: '🏛️' },
      { href: '/dashboard/settings/billing', label: 'Suscripción SaaS', icon: '💳' },
      { href: '/dashboard/menu-pdf', label: 'Menú PDF', icon: '📄' },
    ],
  },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { email?: string | null; name?: string | null; role?: string }
  const role = user.role ?? 'WAITER'

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!section.roles.includes(role)) return false
      if (item.adminOnly && !['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'].includes(role)) return false
      return true
    }),
  })).filter((s) => s.roles.includes(role) && s.items.length > 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-zinc-800/60 flex flex-col bg-zinc-950 shrink-0">
        {/* Logo / restaurante */}
        <div className="px-4 py-5 border-b border-zinc-800/60">
          <p className="text-sm font-bold text-amber-500 tracking-widest uppercase">iMenu</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{user.name ?? user.email}</p>
          <span className="mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-wider
                           bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {role.replace('_', ' ')}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400
                               hover:text-white hover:bg-zinc-800/70 transition-all duration-150
                               active:scale-[0.98]"
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-zinc-800/60">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-zinc-950">
        {children}
      </main>
    </div>
  )
}
