'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-aware navbar. Uses `fixed` positioning so height changes never
 * affect document flow (no jitter). A static spacer reserves the initial
 * space. The `will-change: transform` hint ensures the browser composites
 * the nav on its own layer for buttery GPU-accelerated transitions.
 */
export function NavbarShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  const ticking = useRef(false)

  useEffect(() => {
    function update() {
      setScrolled(window.scrollY > 20)
      ticking.current = false
    }

    function onScroll() {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(update)
      }
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <nav
        data-scrolled={scrolled || undefined}
        className={[
          'fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between overflow-visible md:overflow-hidden',
          'transition-[height,background-color,border-radius,box-shadow,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          scrolled
            ? 'md:h-[70px] h-[126px] md:rounded-b-2xl md:bg-[var(--color-cream)]/95 bg-[var(--color-cream)] md:backdrop-blur-xl backdrop-blur-md md:shadow-md md:border-b md:border-black/[0.06] border-b-[1.5px] border-[var(--color-divider)]'
            : 'h-[126px] bg-[var(--color-cream)] backdrop-blur-md border-b-[1.5px] border-[var(--color-divider)]',
        ].join(' ')}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {children}
      </nav>
      {/* Static spacer — matches the full-size navbar height so page content
          starts below it. Fixed, never changes, so no layout shift. */}
      <div className="h-[126px] w-full" />
    </>
  )
}
