import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Confirma tu email — iMenu' }

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-6xl">📬</div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Revisa tu email</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Te enviamos un link de confirmación. Haz clic en él para activar tu cuenta y empezar a usar iMenu.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">¿No encuentras el email?</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Revisa tu carpeta de spam o correo no deseado.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>El link expira en 24 horas.</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>Si el servidor no tiene SMTP configurado, el link aparece en la consola del servidor.</li>
          </ul>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Volver al login
        </Link>
      </div>
    </div>
  )
}
