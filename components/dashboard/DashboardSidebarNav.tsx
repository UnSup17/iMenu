'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface NavItem {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
}

export interface NavSection {
  label: string
  roles: string[]
  items: NavItem[]
}

interface DashboardSidebarNavProps {
  sections: NavSection[]
}

export function DashboardSidebarNav({ sections }: DashboardSidebarNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500/80">
            {section.label}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 active:scale-[0.98] ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-bold border-l-2 border-amber-500 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="text-base leading-none shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
