import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { getResolvedBrandTheme } from '@/lib/branding/resolver'
import { BrandThemeInjector } from '@/components/branding/BrandThemeInjector'
import { DashboardSidebarNav } from '@/components/dashboard/DashboardSidebarNav'

const NAV_SECTIONS = [
  {
    label: 'Operaciones',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'KITCHEN'],
    items: [
      { href: '/dashboard', label: 'Inicio', icon: '🏠' },
      { href: '/dashboard/menu', label: 'Gestor de Menú', icon: '🍽️' },
      { href: '/dashboard/additions', label: 'Adiciones & Extras', icon: '➕' },
      { href: '/dashboard/special-offers', label: 'Ofertas & Festividades', icon: '✨' },
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
    label: 'Plazas Gastronómicas',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'FOOD_COURT_ADMIN', 'RESTAURANT_ADMIN'],
    items: [
      { href: '/dashboard/food-courts', label: 'Sedes Compartidas', icon: '🏪' },
    ],
  },
  {
    label: 'Identidad de Marca',
    roles: ['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN', 'FOOD_COURT_ADMIN'],
    items: [
      { href: '/dashboard/brand', label: 'Estudio de Marca', icon: '🎨' },
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
      { href: '/dashboard/settings/team', label: 'Equipo & Roles', icon: '👥' },
      { href: '/dashboard/settings/security', label: 'Seguridad (2FA)', icon: '🔒' },
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

  const user = session.user as {
    id?: string
    email?: string | null
    name?: string | null
    role?: string
    restaurantId?: string | null
    restaurantSlug?: string | null
    organizationId?: string | null
    foodCourtId?: string | null
  }
  const role = user.role ?? 'WAITER'

  const brandTheme = await getResolvedBrandTheme({
    restaurantId: user.restaurantId,
    foodCourtId: user.foodCourtId,
    organizationId: user.organizationId,
  })

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!section.roles.includes(role)) return false
      if (item.adminOnly && !['SUPERADMIN', 'ORG_ADMIN', 'RESTAURANT_ADMIN'].includes(role)) return false
      return true
    }),
  })).filter((s) => s.roles.includes(role) && s.items.length > 0)

  return (
    <div
      className="min-h-screen bg-zinc-950 text-white flex transition-colors duration-200"
      style={{
        backgroundColor: 'var(--brand-bg, #09090b)',
        color: 'var(--brand-text, #ffffff)',
      }}
    >
      <BrandThemeInjector theme={brandTheme} id="brand-theme-layout-styles" />

      {/* Sidebar */}
      <aside
        className="w-64 border-r border-zinc-800/60 flex flex-col bg-zinc-900/90 backdrop-blur-md shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: 'var(--brand-surface, #18181b)',
        }}
      >
        {/* Logo / restaurante */}
        <div className="px-5 py-5 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            {brandTheme.logoUrl ? (
              <img
                src={brandTheme.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-zinc-950/40 p-1 border border-zinc-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shadow-sm">
                🍽️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-amber-500 tracking-wider uppercase truncate font-heading">
                {user.restaurantSlug ? user.restaurantSlug.replace(/-/g, ' ') : 'iMenu'}
              </p>
              <p className="text-xs text-zinc-400 truncate">{user.name ?? user.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full border border-zinc-700/60">
              {role.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">White-Label</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <DashboardSidebarNav sections={visibleSections} />
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-zinc-800/60">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-auto bg-zinc-950 transition-colors duration-200 flex flex-col"
        style={{
          backgroundColor: 'var(--brand-bg, #09090b)',
        }}
      >
        {session.user.isImpersonating && (
          <div className="bg-amber-500 text-zinc-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shadow-lg sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>
                MODO IMPERSONACIÓN: Operando como <span className="underline">{user.email}</span>{' '}
                {user.restaurantSlug && `(${user.restaurantSlug})`} — Sesión iniciada por{' '}
                {session.user.impersonatorEmail}
              </span>
            </div>
            <form action="/api/superadmin/stop-impersonate" method="POST">
              <button
                type="submit"
                className="px-3 py-1 bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer text-xs font-semibold"
              >
                Salir de impersonación ✕
              </button>
            </form>
          </div>
        )}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}

