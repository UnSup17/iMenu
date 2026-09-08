import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PLAN_CONFIGS } from '@/lib/subscription'

export default async function SuperadminHubPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { role?: string }
  if (user.role !== 'SUPERADMIN') {
    return (
      <div className="p-8 text-center text-zinc-400">
        Acceso restringido. Solo Superadministradores de la plataforma.
      </div>
    )
  }

  const [organizations, totalRestaurants, totalUsers, totalInvoices] = await Promise.all([
    prisma.organization.findMany({
      include: {
        subscription: true,
        restaurants: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.restaurant.count(),
    prisma.user.count(),
    prisma.invoice.count(),
  ])

  // Cálculo de MRR aproximado
  let estimatedMRR = 0
  for (const org of organizations) {
    const tier = org.plan
    estimatedMRR += PLAN_CONFIGS[tier]?.priceMonthlyCOP || 0
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Superadmin — Panel Global SaaS
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Control de todas las organizaciones, clientes gastronómicos, suscripciones y métricas de plataforma.
          </p>
        </div>

        <Link
          href="/dashboard/superadmin/organizations"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 transition"
        >
          🏢 Administrar Organizaciones
        </Link>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">MRR Estimado (Plataforma)</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            ${estimatedMRR.toLocaleString('es-CO')}
          </p>
          <span className="text-[11px] text-zinc-500">Ingresos mensuales recurrentes</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Organizaciones Clientes</span>
          <p className="text-2xl font-black text-white mt-1">{organizations.length}</p>
          <span className="text-[11px] text-zinc-500">Franquicias y restaurantes</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Sucursales Activas</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{totalRestaurants}</p>
          <span className="text-[11px] text-zinc-500">Restaurantes creados</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-xl">
          <span className="text-xs text-zinc-500 uppercase font-semibold">Usuarios Registrados</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{totalUsers}</p>
          <span className="text-[11px] text-zinc-500">{totalInvoices} facturas emitidas globalmente</span>
        </div>
      </div>

      {/* Organizaciones Recientes */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white">Organizaciones y Cuentas Recientes</h2>
          <Link
            href="/dashboard/superadmin/organizations"
            className="text-xs text-amber-400 hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/60 text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Organización</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-center">Plan</th>
                <th className="px-4 py-3 text-center">Sucursales</th>
                <th className="px-4 py-3 text-center">Estado Suscripción</th>
                <th className="px-4 py-3 text-right">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {organizations.slice(0, 8).map((org) => (
                <tr key={org.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{org.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-zinc-800 text-amber-400 border border-zinc-700">
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-zinc-200">
                    {org.restaurants.length}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                      {org.subscription?.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {new Date(org.createdAt).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
