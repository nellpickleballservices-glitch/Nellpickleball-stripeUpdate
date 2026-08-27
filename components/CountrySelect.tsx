'use client'

import { useState, useRef, useEffect } from 'react'
import { countries, type Country } from '@/lib/data/countries'

interface CountrySelectProps {
  name: string
  label: string
  locale: 'en' | 'es'
  defaultValue?: string
  onChange?: (code: string) => void
}

/** Filter countries matching search in BOTH languages regardless of locale */
export function filterCountries(search: string): Country[] {
  if (!search) return [...countries]
  const lower = search.toLowerCase()
  return countries.filter(
    (c) =>
      c.nameEn.toLowerCase().includes(lower) ||
      c.nameEs.toLowerCase().includes(lower),
  )
}

/** Sort countries with DR pinned first, rest alphabetical in given locale */
export function sortWithDRFirst(list: Country[], locale: 'en' | 'es'): Country[] {
  const dr = list.find((c) => c.code === 'DO')
  const rest = list
    .filter((c) => c.code !== 'DO')
    .sort((a, b) =>
      (locale === 'es' ? a.nameEs : a.nameEn).localeCompare(
        locale === 'es' ? b.nameEs : b.nameEn,
      ),
    )
  return dr ? [dr, ...rest] : rest
}

export function CountrySelect({
  name,
  label,
  locale,
  defaultValue = 'DO',
  onChange,
}: CountrySelectProps) {
  const [selected, setSelected] = useState(defaultValue)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = filterCountries(search)
  const sorted = sortWithDRFirst(filtered, locale)
  const selectedCountry = countries.find((c) => c.code === selected)
  const displayName =
    selectedCountry
      ? locale === 'es'
        ? selectedCountry.nameEs
        : selectedCountry.nameEn
      : ''

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Focus search input when opening
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={selected} />
      <label className="text-offwhite text-sm font-medium block mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          if (open) setSearch('')
        }}
        className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors text-left flex items-center gap-2"
      >
        {selectedCountry && (
          <span className="text-lg">{selectedCountry.flag}</span>
        )}
        <span>{displayName}</span>
        <svg
          className={`ml-auto w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-charcoal border border-white/20 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                }
              }}
              placeholder={locale === 'es' ? 'Buscar...' : 'Search...'}
              className="w-full bg-midnight text-offwhite border border-white/20 focus:border-turquoise rounded-md px-3 py-1.5 outline-none text-sm"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {sorted.map((c, i) => {
              const isDR = c.code === 'DO'
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c.code)
                      setOpen(false)
                      setSearch('')
                      onChange?.(c.code)
                    }}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-turquoise/10 transition-colors text-sm ${
                      c.code === selected
                        ? 'text-turquoise'
                        : 'text-offwhite'
                    } ${isDR ? 'border-b border-white/20' : ''}`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span>
                      {locale === 'es' ? c.nameEs : c.nameEn}
                    </span>
                    <span className="ml-auto text-white/70 text-xs">
                      {c.code}
                    </span>
                  </button>
                </li>
              )
            })}
            {sorted.length === 0 && (
              <li className="px-4 py-3 text-white/80 text-sm text-center">
                {locale === 'es' ? 'Sin resultados' : 'No results'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
