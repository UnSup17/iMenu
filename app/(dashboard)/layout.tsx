import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800 flex flex-col p-4 gap-2">
        <div className="px-2 py-3 mb-2">
          <p className="text-xs font-bold text-amber-500 tracking-widest uppercase">iMenu</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{session.user.email}</p>
        </div>

        <nav className="space-y-1">
          {[
            { href: '/dashboard', label: '🏠 Inicio' },
            { href: '/dashboard/orders', label: '📋 Pedidos' },
            { href: '/dashboard/tables', label: '🪑 Mesas' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white
                         hover:bg-zinc-800 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-500
                         hover:text-red-400 hover:bg-zinc-800 transition-colors"
            >
              ↩ Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
