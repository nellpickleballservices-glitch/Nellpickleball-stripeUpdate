'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, m } from 'motion/react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { logoutAction } from '@/app/actions/auth'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/components/Navbar'

interface MobileNavProps {
  user: User | null
  isAdmin: boolean
  profile: UserProfile | null
}

export function MobileNav({ user, isAdmin, profile }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const [navBottom, setNavBottom] = useState(0)
  const t = useTranslations('Nav')
  const tBilling = useTranslations('Billing')
  const tAdmin = useTranslations('Admin')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const updatePosition = useCallback(() => {
    // Find the parent <nav> to align with its bottom edge
    const nav = buttonRef.current?.closest('nav')
    if (nav) {
      setNavBottom(nav.getBoundingClientRect().bottom)
    }
  }, [])

  // Position the menu below the navbar
  useEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  // Close on click/touch outside and on scroll
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    function handleScroll() {
      setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [open])

  const close = () => setOpen(false)

  const publicLinks = [
    { href: '/#sessions', label: t('sessions') },
    { href: '/learn-pickleball', label: t('learn') },
    { href: '/gallery', label: t('gallery') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <div className="md:hidden">
      {/* Hamburger / X toggle button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-nav-link)]">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <span className="w-6 h-0.5 bg-[var(--color-nav-link)] rounded-full" />
            <span className="w-6 h-0.5 bg-[var(--color-nav-link)] rounded-full" />
            <span className="w-6 h-0.5 bg-[var(--color-nav-link)] rounded-full" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={menuRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{ top: navBottom }}
            className="fixed right-0 z-[9999] w-64 bg-charcoal border border-lime/20 rounded-bl-lg shadow-2xl shadow-black/50"
          >
            {/* Nav links */}
            <nav className="flex flex-col py-2">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    close()
                    if (link.href.includes('#')) {
                      const hash = link.href.split('#')[1]
                      const el = document.getElementById(hash)
                      if (el) {
                        e.preventDefault()
                        setTimeout(() => {
                          el.scrollIntoView({ behavior: 'smooth' })
                          window.history.replaceState(null, '', `#${hash}`)
                        }, 200)
                      }
                    }
                  }}
                  className="font-bungee px-4 py-2.5 text-offwhite hover:text-lime hover:bg-slate/50 transition-colors text-sm"
                >
                  {link.label}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  href="/n3ll-admin-x9k2"
                  onClick={close}
                  className="font-bungee px-4 py-2.5 text-offwhite hover:text-lime hover:bg-slate/50 transition-colors text-sm"
                >
                  {tAdmin('adminNav')}
                </Link>
              )}
            </nav>

            {/* Language switcher + auth */}
            <div className="border-t border-slate/50 px-4 py-3 flex flex-col gap-2">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>

              {!user && (
                <div className="flex flex-col gap-2 mt-1">
                  <Link
                    href="/login"
                    onClick={close}
                    className="text-center py-2 text-offwhite text-sm border border-offwhite/50 rounded-full hover:border-lime hover:text-lime transition-colors"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={close}
                    className="text-center py-2 bg-lime text-midnight text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
                  >
                    {t('signup')}
                  </Link>
                </div>
              )}

              {user && profile && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-lime text-midnight flex items-center justify-center text-xs font-bold uppercase">
                      {profile.firstName.charAt(0)}
                    </span>
                    <span className="text-offwhite text-sm font-semibold">{profile.firstName}</span>
                  </div>
                  <p className="text-white/50 text-xs mb-2">
                    {t('memberSince')} {new Date(profile.memberSince).toLocaleString('default', { month: 'short' })} {new Date(profile.memberSince).getFullYear()}
                  </p>
                  {profile.activeSessions.length > 0 && (
                    <div className="mb-2">
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-1">{t('activeSessions')}</p>
                      <ul className="space-y-1">
                        {profile.activeSessions.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex justify-between text-xs">
                            <span className="text-offwhite truncate mr-2">{s.title}</span>
                            <span className="text-lime font-mono whitespace-nowrap">{s.startTime}–{s.endTime}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {user && (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    onClick={close}
                    className="w-full text-center py-2 text-offwhite text-sm border border-offwhite/30 rounded-full hover:border-sunset hover:text-sunset transition-colors"
                  >
                    {t('logout')}
                  </button>
                </form>
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
