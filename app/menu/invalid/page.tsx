import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sesión Inválida — iMenu',
}

interface PageProps {
  searchParams: Promise<{ reason?: string }>
}

const reasons: Record<string, { title: string; description: string }> = {
  no_token: {
    title: 'Código QR requerido',
    description: 'Por favor escanea el código QR de tu mesa para acceder al menú.',
  },
  expired_session: {
    title: 'Sesión expirada',
    description: 'Tu sesión de mesa ha expirado o el código QR ya no es válido. Por favor solicita un nuevo código al mesero.',
  },
  default: {
    title: 'Acceso no válido',
    description: 'No tienes acceso al menú. Por favor escanea el código QR de tu mesa.',
  },
}

export default async function InvalidSessionPage({ searchParams }: PageProps) {
  const { reason } = await searchParams
  const content = reasons[reason ?? 'default'] ?? reasons['default']

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-5xl">📵</p>
        <h1 className="text-xl font-bold text-white">{content.title}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">{content.description}</p>
        <div className="pt-2">
          <p className="text-xs text-zinc-600">¿Necesitas ayuda? Habla con tu mesero.</p>
        </div>
      </div>
    </div>
  )
}
