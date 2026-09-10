'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Heroicons mini (20x20) — kept inline to avoid a dependency
const icons: Record<string, ReactNode> = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
    </svg>
  ),
  cms: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  ),
  gallery: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-4.97-4.969a.75.75 0 0 0-1.06 0L2.5 11.06ZM12 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd" />
    </svg>
  ),
  expeditions: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
    </svg>
  ),
  specialEvents: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h.5A2.5 2.5 0 0 1 19 6.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 1 15.5v-9A2.5 2.5 0 0 1 3.5 4H4V3a1 1 0 0 1 1-1Zm5.75 7.25a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5Z" clipRule="evenodd" />
    </svg>
  ),
  interests: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM7 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.464 5.535a1 1 0 1 0-1.415-1.414 3 3 0 0 1-4.242 0 1 1 0 0 0-1.415 1.414 5 5 0 0 0 7.072 0Z" clipRule="evenodd" />
    </svg>
  ),
  sessions: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  ),
}

const navItems = [
  { key: 'dashboard', href: '/n3ll-admin-x9k2' },
  { key: 'users', href: '/n3ll-admin-x9k2/users' },
  { key: 'cms', href: '/n3ll-admin-x9k2/cms' },
  { key: 'gallery', href: '/n3ll-admin-x9k2/gallery' },
  { key: 'expeditions', href: '/n3ll-admin-x9k2/expeditions' },
  { key: 'specialEvents', href: '/n3ll-admin-x9k2/special-events' },
  { key: 'sessions', href: '/n3ll-admin-x9k2/sessions' },
  { key: 'interests', href: '/n3ll-admin-x9k2/interests' },
]

export function AdminSidebar({ locale }: { locale: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Admin')

  // Eagerly prefetch all admin pages on mount so navigation feels instant
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(`/${locale}${item.href}`)
    })
  }, [locale, router])

  const isActive = (href: string) => {
    // Strip locale prefix for comparison
    const cleanPath = pathname.replace(`/${locale}`, '') || '/'
    if (href === '/n3ll-admin-x9k2') {
      return cleanPath === '/n3ll-admin-x9k2' || cleanPath === '/n3ll-admin-x9k2/'
    }
    return cleanPath.startsWith(href)
  }

  const navContent = (
    <nav className="flex flex-col gap-1 mt-8">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.key}
            href={`/${locale}${item.href}`}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? 'border-l-4 border-lime text-lime bg-lime/5'
                : 'border-l-4 border-transparent text-white hover:text-offwhite hover:bg-white/5'
            }`}
          >
            <span className="w-5 h-5 shrink-0">{icons[item.key]}</span>
            <span>{t(item.key)}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile drawer handle — vertically centered on the left viewport edge.
          When the drawer is closed, the chevron points right (open). When
          open, the handle slides to the drawer's right edge and the chevron
          flips to point left (close). z-[60] keeps it above the sidebar so
          it's tappable in both states. */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={mobileOpen}
        className={`fixed top-1/2 left-0 z-[60] md:hidden flex items-center justify-center h-14 w-7 rounded-r-xl shadow-lg bg-[var(--color-cream)] text-[var(--color-nav-link)] border-r border-y border-[var(--color-divider)] transition-transform duration-200 -translate-y-1/2 ${
          mobileOpen ? 'translate-x-64' : 'translate-x-0'
        }`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-midnight z-50 flex flex-col border-r-[1.5px] border-[var(--color-divider)] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Spacer — matches the public navbar height so sidebar content
            starts below the sticky navbar overlay. */}
        <div className="bg-[var(--color-cream)] px-6 py-3 border-b-[1.5px] border-[var(--color-divider)]">
          <Link href={locale === 'es' ? '/' : `/${locale}`} className="inline-block">
            <Image src="/images/icons/NellLogo.png" alt="NELL" width={200} height={100} className="h-[100px] w-[200px] scale-125 origin-left" />
          </Link>
        </div>

        {navContent}
      </aside>
    </>
  )
}
