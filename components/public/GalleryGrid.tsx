'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { AnimatePresence, m } from 'motion/react'
import type { GalleryItem } from '@/lib/types/admin'

interface GalleryGridProps {
  items: GalleryItem[]
  locale: string
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
  } catch { /* not a youtube url */ }
  return null
}

const GRID_SPAN: Record<string, string> = {
  '1x1': 'col-span-1 row-span-1',
  '1x2': 'col-span-1 row-span-2',
  '2x1': 'col-span-2 row-span-1',
  '2x2': 'col-span-2 row-span-2',
}

export function GalleryGrid({ items, locale }: GalleryGridProps) {
  const t = useTranslations('Gallery')
  // Track the open item by its index so we can step through prev/next without
  // rebuilding the modal each time.
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // The portal target only exists after the component mounts on the client —
  // gating it with `mounted` prevents an SSR/hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const touchStartXRef = useRef<number | null>(null)
  const SWIPE_THRESHOLD = 50

  const isOpen = activeIndex !== null
  const current = activeIndex !== null ? items[activeIndex] : null
  const count = items.length

  const title = (item: GalleryItem) =>
    locale === 'en' ? (item.title_en ?? item.title_es) : (item.title_es ?? item.title_en)
  const caption = (item: GalleryItem) =>
    locale === 'en' ? (item.caption_en ?? item.caption_es) : (item.caption_es ?? item.caption_en)

  const close = useCallback(() => setActiveIndex(null), [])
  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + count) % count))
  }, [count])
  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % count))
  }, [count])

  // Keyboard: Escape closes, ←/→ navigate.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close, goPrev, goNext])

  // Lock body scroll while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Touch swipe to navigate (mobile).
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || count <= 1) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current
    const diff = endX - touchStartXRef.current
    touchStartXRef.current = null
    if (Math.abs(diff) < SWIPE_THRESHOLD) return
    if (diff > 0) goPrev()
    else goNext()
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[200px] md:auto-rows-[250px] gap-3">
        {items.map((item, index) => {
          const ytId = item.media_type === 'video' ? getYouTubeId(item.url) : null
          const thumb = item.thumbnail_url ?? (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null)

          return (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={`relative group overflow-hidden rounded-xl cursor-pointer ${GRID_SPAN[item.grid_size] ?? 'col-span-1 row-span-1'}`}
            >
              {item.media_type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={title(item) ?? ''}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={title(item) ?? ''}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-charcoal flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-sunset">
                        <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.15] flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-white ml-1">
                        <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
                      </svg>
                    </div>
                  </div>
                </>
              )}

              {/* Hover overlay — frosted glass panel at bottom */}
              <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                <div className="bg-black/30 backdrop-blur-xl backdrop-saturate-150 border-t border-white/[0.12] p-4">
                  {title(item) && (
                    <p className="text-white font-semibold text-sm leading-tight">{title(item)}</p>
                  )}
                  {caption(item) && (
                    <p className="text-white/80 text-xs mt-1 line-clamp-2">{caption(item)}</p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ─── Lightbox modal — full viewport, centered media, top bar + side arrows.
            Rendered through a portal directly into <body> so it escapes the
            ScrollReveal + section stacking contexts and covers the sticky navbar. */}
      {mounted && createPortal(
      <AnimatePresence>
        {isOpen && current && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex flex-col bg-black"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            onClick={close}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top bar — Back button on the left, image counter on the right.
                Bubbles to the backdrop click handler so an empty-area tap closes. */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4">
              <button
                onClick={close}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 border border-white/[0.12] hover:bg-white/[0.15] text-white text-sm font-medium transition-colors"
                aria-label={t('close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                <span>{t('close')}</span>
              </button>

              {count > 1 && (
                <span className="text-white/70 text-sm font-medium tabular-nums">
                  {(activeIndex ?? 0) + 1} / {count}
                </span>
              )}
            </div>

            {/* Media stage — flex-1 so it absorbs all the remaining vertical
                space; min-h-0 lets it actually shrink inside the column.
                Tapping the image bubbles up and closes the modal. */}
            <div className="flex-1 min-h-0 relative flex items-center justify-center px-4 sm:px-20">
              {/* Prev arrow — stop propagation so navigating doesn't also close. */}
              {count > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goPrev() }}
                  aria-label="Previous image"
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 border border-white/[0.12] hover:bg-white/[0.15] text-white transition-colors z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              <m.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-center"
              >
                {current.media_type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current.url}
                    alt={title(current) ?? ''}
                    className="max-w-full max-h-full object-contain rounded-lg select-none"
                    draggable={false}
                  />
                ) : (
                  (() => {
                    const ytId = getYouTubeId(current.url)
                    return ytId ? (
                      <div className="w-full max-w-5xl aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                          title={title(current) ?? 'Video'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full rounded-lg"
                        />
                      </div>
                    ) : (
                      <video
                        src={current.url}
                        controls
                        autoPlay
                        className="max-w-full max-h-full rounded-lg"
                      />
                    )
                  })()
                )}
              </m.div>

              {/* Next arrow — stop propagation so navigating doesn't also close. */}
              {count > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goNext() }}
                  aria-label="Next image"
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 border border-white/[0.12] hover:bg-white/[0.15] text-white transition-colors z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Caption — fixed at bottom, centered. Click bubbles to close. */}
            {(title(current) || caption(current)) && (
              <div className="shrink-0 px-6 py-4 text-center">
                <div className="inline-block px-6 py-3 rounded-2xl bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 border border-white/[0.12]">
                  {title(current) && (
                    <p className="text-white font-semibold text-lg leading-tight">{title(current)}</p>
                  )}
                  {caption(current) && (
                    <p className="text-white/70 text-sm mt-1 max-w-2xl mx-auto">{caption(current)}</p>
                  )}
                </div>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  )
}
