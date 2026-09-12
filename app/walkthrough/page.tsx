import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WalkthroughContent } from '@/components/walkthrough/WalkthroughContent'
import type { RoleType } from '@/lib/walkthrough-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Manual de Usuario & Guía Operativa — iMenu',
  description:
    'Manual de usuario interactivo con procedimientos paso a paso, capturas de pantalla y consideraciones operativas para tu perfil.',
}

export default async function WalkthroughPage() {
  const session = await auth()

  // Protección estricta: No se permite acceso en incógnito ni sin perfil activo
  if (!session?.user) {
    redirect('/login?callbackUrl=/walkthrough')
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user.role as RoleType) || 'WAITER',
    restaurantSlug: session.user.restaurantSlug,
  }

  return <WalkthroughContent user={user} />
}
