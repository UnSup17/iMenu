import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getOrCreateOrganizationSubscription, PLAN_CONFIGS } from '@/lib/subscription'

export default async function OrganizationHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { organizationId?: string; restaurantId?: string; role?: string }
  let orgId = user.organizationId

  if (!orgId && user.restaurantId) {
    const rest = await prisma.restaurant.findUnique({ where: { id: user.restaurantId } })
    orgId = rest?.organizationId || undefined
  }

  if (!orgId) {
    return (
      <div className="p-8 text-center text-zinc-400">
        No tienes una organización configurada.
      </div>
    )
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      restaurants: {
        include: {
          tables: { select: { id: true, status: true } },
          _count: { select: { orders: true, invoices: true, users: true } },
        },
      },
    },
  })

  if (!organization) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Organización no encontrada.
      </div>
    )
  }

  const subscription = await getOrCreateOrganizationSubscription(orgId)
  const currentPlan = PLAN_CONFIGS[subscription.tier]
  const branches = organization.restaurants

  // Estadísticas rápidas
  const totalTables = branches.reduce((acc, b) => acc + b.tables.length, 0)
  const activeSessionsCount = branches.reduce(
    (acc, b) => acc + b.tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length,
    0
  )
  const totalStaff = branches.reduce((acc, b) => acc + b._count.users, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {organization.name}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentPlan.name}
              </span>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Panel de control multi-sucursal y gestión corporativa de franquicia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/org/reports"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            📊 Reportes Consolidados
          </Link>
          <Link
            href="/dashboard/org/branches"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition"
          >
            ➕ Gestionar Sucursales
          </Link>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Sucursales Activas</span>
          <p className="text-2xl font-black text-white mt-1">
            {branches.length}{' '}
            <span className="text-xs font-normal text-zinc-400">
              / {currentPlan.maxBranches === -1 ? 'Ilimitadas' : currentPlan.maxBranches}
            </span>
          </p>
          <span className="text-[11px] text-zinc-500">Ubicaciones de tu cadena</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Total Mesas</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{totalTables}</p>
          <span className="text-[11px] text-zinc-500">Distribuidas en todas las sedes</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Mesas Ocupadas Ahora</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activeSessionsCount}</p>
          <span className="text-[11px] text-zinc-500">Sesiones QR activas</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Equipo y Personal</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{totalStaff}</p>
          <span className="text-[11px] text-zinc-500">Usuarios asignados</span>
        </div>
      </div>

      {/* Grid de Sucursales */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📍</span> Sucursales de la Franquicia
          </h2>
          <Link href="/dashboard/org/branches" className="text-xs text-amber-400 hover:underline">
            Ver todas / Agregar nueva →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => {
            const activeTables = b.tables.filter((t) => t.status === 'ACTIVE_QR_SESSION').length
            return (
              <div
                key={b.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base truncate">{b.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        b.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {b.isActive ? '🟢 Operando' : '⚪ Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">/menu/{b.slug}</p>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800/80 text-center">
                    <div className="bg-zinc-950/60 p-2 rounded-lg">
                      <span className="text-[10px] text-zinc-500 block">Mesas</span>
                      <span className="font-bold text-sm text-zinc-200">{b.tables.length}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded-lg">
                      <span className="text-[10px] text-zinc-500 block">Ocupadas</span>
                      <span className="font-bold text-sm text-amber-400">{activeTables}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-2 rounded-lg">
                      <span className="text-[10px] text-zinc-500 block">Facturas</span>
                      <span className="font-bold text-sm text-zinc-200">{b._count.invoices}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <a
                    href={`/menu/${b.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Abrir Menú QR ↗
                  </a>
                  <Link
                    href={`/dashboard`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                  >
                    Ver Operación →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
