'use client'

import { useState, useRef, useEffect } from 'react'
import { type Locale } from '@/lib/i18n/menu-translations'

interface LanguageSelectorProps {
  currentLocale: Locale
  onChangeLocale?: (locale: Locale) => void
  onLocaleChange?: (locale: Locale) => void
}

const LANGUAGES: Array<{ code: Locale; flag: string; label: string }> = [
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
]

export function LanguageSelector({
  currentLocale,
  onChangeLocale,
  onLocaleChange,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeLang = LANGUAGES.find((l) => l.code === currentLocale) || LANGUAGES[0]

  const handleSelect = (code: Locale) => {
    onChangeLocale?.(code)
    onLocaleChange?.(code)
    setOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors shadow-sm cursor-pointer"
        title="Cambiar idioma / Change language"
      >
        <span className="text-sm leading-none">{activeLang.flag}</span>
        <span className="uppercase text-[11px] font-bold text-zinc-300">{activeLang.code}</span>
        <span className="text-[10px] text-zinc-500">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800/80 mb-1">
            Idioma / Language
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                handleSelect(lang.code)
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                lang.code === currentLocale
                  ? 'bg-amber-500/15 text-amber-400 font-bold'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
              {lang.code === currentLocale && <span className="text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
