import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SecurityClientView from './SecurityClientView'

export const metadata = {
  title: 'Seguridad & 2FA — iMenu',
}

export default async function SecuritySettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, email: true },
  })

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Seguridad de la Cuenta</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gestiona los métodos de autenticación y protección de acceso para tu usuario.
        </p>
      </div>

      <SecurityClientView
        initialEnabled={Boolean(user?.twoFactorEnabled)}
        email={user?.email || ''}
      />
    </div>
  )
}
