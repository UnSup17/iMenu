import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — iMenu',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-2">Bienvenido, {session.user.name ?? session.user.email}</h1>
      <p className="text-zinc-400 text-sm">Usa el menú lateral para navegar a Pedidos o Mesas.</p>
    </div>
  )
}
