'use client'

import { useState, useRef, useEffect } from 'react'
import type { UserProfile } from '@/components/Navbar'

interface UserProfileDropdownProps {
  profile: UserProfile
  logoutAction: () => Promise<void>
  t: {
    logout: string
    since: string
    activeSessions: string
    noSessions: string
  }
}

export function UserProfileDropdown({ profile, logoutAction, t }: UserProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const memberDate = new Date(profile.memberSince)
  const sinceLabel = `${memberDate.toLocaleString('default', { month: 'short' })} ${memberDate.getFullYear()}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 font-bungee text-sm text-[var(--color-nav-link)] hover:text-[var(--color-nav-link-hover)] transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-lime text-midnight flex items-center justify-center text-xs font-bold uppercase">
          {profile.firstName.charAt(0)}
        </span>
        {profile.firstName}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-charcoal border border-lime/20 rounded-lg shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-offwhite font-semibold text-sm">{profile.firstName}</p>
            <p className="text-white/50 text-xs">{t.since} {sinceLabel}</p>
          </div>

          {/* Active sessions */}
          <div className="px-4 py-3">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-2">{t.activeSessions}</p>
            {profile.activeSessions.length === 0 ? (
              <p className="text-white/40 text-xs">{t.noSessions}</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {profile.activeSessions.map((s, i) => (
                  <li key={i} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-offwhite font-medium">{s.title}</p>
                      <p className="text-white/50">{s.date}</p>
                    </div>
                    <span className="text-lime font-mono text-xs whitespace-nowrap">
                      {s.startTime}–{s.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-white/10 px-4 py-2">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full text-left text-sm text-white/70 hover:text-sunset transition-colors py-1"
              >
                {t.logout}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
