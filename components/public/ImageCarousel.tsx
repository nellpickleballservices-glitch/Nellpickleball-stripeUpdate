'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface ImageCarouselProps {
  images: string[]
  alt: string
  /** Time between auto-advances, in ms. Set to 0 to disable auto-cycling. */
  autoPlayMs?: number
  /** Show interactive prev/next arrows and clickable dots (off inside clickable cards). */
  showControls?: boolean
  /** Extra classes applied to each <img> (e.g. hover-scale on cards). */
  imgClassName?: string
  /** Extra classes applied to the carousel container. */
  className?: string
  /**
   * 'cover' (default) crops images to fill the container.
   * 'contain' fits the full image inside the container and fills the leftover space
   * with a blurred copy of the same image — useful for hero areas where source
   * photos have mixed aspect ratios.
   */
  fit?: 'cover' | 'contain'
  /**
   * When true, replace the bottom dot pager with a row of clickable thumbnail
   * previews. Always interactive regardless of `showControls`.
   */
  thumbnails?: boolean
}

/**
 * Crossfading image carousel. Auto-cycles on a timer and, when `showControls`
 * is set, exposes arrows + dots for manual navigation. The container fills its
 * parent, so size it via the wrapping element.
 */
export function ImageCarousel({
  images,
  alt,
  autoPlayMs = 4500,
  showControls = false,
  imgClassName = '',
  className = '',
  fit = 'cover',
  thumbnails = false,
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = images.length
  const indexRef = useRef(index)
  indexRef.current = index

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  )

  // Swipe support — track the start-x of a touch and, on release, advance the
  // carousel if the user dragged past the threshold. ~50px feels natural on
  // phones; smaller and accidental scrolls trigger navigation.
  const SWIPE_THRESHOLD = 50
  const touchStartXRef = useRef<number | null>(null)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }, [])
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartXRef.current === null || count <= 1) return
      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current
      const diff = endX - touchStartXRef.current
      touchStartXRef.current = null
      if (Math.abs(diff) < SWIPE_THRESHOLD) return
      setIndex((i) => (diff > 0 ? (i - 1 + count) % count : (i + 1) % count))
    },
    [count]
  )

  useEffect(() => {
    if (count <= 1 || autoPlayMs <= 0 || paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), autoPlayMs)
    return () => clearInterval(id)
  }, [count, autoPlayMs, paused])

  if (count === 0) return null

  const dotBase = 'rounded-full transition-all duration-300'
  const showThumbStrip = count > 1 && thumbnails

  // A slide is "live" (rendered with its <img>) only if it's the current slide
  // or an immediate neighbor. Off-screen slides render an empty placeholder so
  // the crossfade still has a stable element to transition opacity on, but the
  // browser never fetches their high-res sources until they come into rotation.
  const isLive = (i: number): boolean => {
    if (count <= 3) return true
    const prev = (index - 1 + count) % count
    const next = (index + 1) % count
    return i === index || i === prev || i === next
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className} ${showThumbStrip ? 'flex flex-col' : ''}`}
      onMouseEnter={() => showControls && setPaused(true)}
      onMouseLeave={() => showControls && setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: count > 1 ? 'pan-y' : undefined }}
    >
      {/* Shared blurred backdrop (contain-fit only) — spans the ENTIRE carousel,
          including behind the thumbnail strip, so the strip area shows the same
          blurred image as the hero rather than a flat color. */}
      {fit === 'contain' && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {images.map((src, i) => (
            <div
              key={`bg-${src}-${i}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                i === index ? 'opacity-60' : 'opacity-0'
              }`}
            >
              {isLive(i) && (
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover scale-110 blur-2xl"
                  priority={i === 0}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image stage — takes the full carousel by default, or shrinks above the
          thumbnail strip when one is rendered below. Foreground images only —
          the blurred backdrop above stays unified across the whole carousel. */}
      <div className={`relative overflow-hidden ${showThumbStrip ? 'flex-1 min-h-0' : 'w-full h-full'} z-[1]`}>
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {isLive(i) && (
              <Image
                src={src}
                alt={i === 0 ? alt : ''}
                fill
                sizes={fit === 'cover' ? '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw' : '100vw'}
                className={`${fit === 'contain' ? 'object-contain' : 'object-cover'} ${imgClassName}`}
                priority={i === 0}
              />
            )}
          </div>
        ))}

        {count > 1 && showControls && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.preventDefault()
                go(index - 1)
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.preventDefault()
                go(index + 1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        )}

        {count > 1 && !thumbnails && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {images.map((_, i) =>
              showControls ? (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index}
                  onClick={(e) => {
                    e.preventDefault()
                    go(i)
                  }}
                  className={`${dotBase} ${i === index ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'}`}
                />
              ) : (
                <span
                  key={i}
                  className={`${dotBase} h-1.5 ${i === index ? 'w-5 bg-lime' : 'w-1.5 bg-white/50'}`}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Thumbnail strip — docked below the image stage so it never overlays the photo.
          Sits above the shared blurred backdrop (z-[1]) and stays transparent so the
          same blur shows through behind the previews. */}
      {showThumbStrip && (
        <div className="relative shrink-0 bg-transparent border-b border-black z-[1]">
          <div className="flex items-center justify-center gap-2 p-2 sm:p-3 overflow-x-auto no-scrollbar">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index}
                onClick={(e) => {
                  e.preventDefault()
                  go(i)
                }}
                className={`relative shrink-0 w-16 h-11 sm:w-16 sm:h-12 rounded-md overflow-hidden transition-all ${
                  i === index
                    ? 'ring-2 ring-lime opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={src} alt="" aria-hidden="true" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
