'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from '@/i18n/navigation'

/**
 * Invisible component that prefetches session detail pages once the sessions
 * section scrolls into view. Placed inside the sessions grid so it shares
 * the same visibility lifecycle.
 */
export function SessionsPrefetcher({ hrefs }: { hrefs: string[] }) {
  const router = useRouter()
  const prefetched = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefetched.current || hrefs.length === 0) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hrefs.forEach((href) => router.prefetch(href))
          prefetched.current = true
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hrefs, router])

  return <span ref={ref} aria-hidden className="absolute w-0 h-0" />
}
