'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      type="button"
      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-800/70 transition-all duration-150 cursor-pointer"
    >
      <span>↩</span>
      <span>Cerrar sesión</span>
    </button>
  )
}
