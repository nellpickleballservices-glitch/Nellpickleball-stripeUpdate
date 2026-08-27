'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ScrollProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const hideOn = ['/n3ll-admin-x9k2', '/login', '/signup', '/reset-password']
  if (hideOn.some(p => pathname?.includes(p))) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none overflow-hidden rounded-b-[inherit]">
      <div
        className="h-full origin-left bg-turquoise transition-transform duration-100 ease-out"
        style={{
          width: '100%',
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  )
}
