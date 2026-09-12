import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import TeamClientView from './TeamClientView'

export const metadata = {
  title: 'Gestión de Equipo — iMenu',
}

export default async function TeamSettingsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const restaurantId = session.user.restaurantId
  if (!restaurantId && session.user.role !== 'SUPERADMIN') {
    redirect('/dashboard/orders')
  }

  const members = await prisma.user.findMany({
    where: restaurantId ? { restaurantId } : {},
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      inviteAccepted: true,
      inviteExpiry: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  })

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Equipo</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Invita meseros, cocineros, administradores y contadores a tu restaurante.
        </p>
      </div>

      <TeamClientView
        initialMembers={JSON.parse(JSON.stringify(members))}
        restaurantId={restaurantId || ''}
      />
    </div>
  )
}
