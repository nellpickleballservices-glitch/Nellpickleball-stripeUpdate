import { getLocale, getTranslations } from 'next-intl/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { SessionCard } from '@/components/public/SessionCard'
import { SessionsPrefetcher } from '@/components/public/SessionsPrefetcher'
import { AmenitiesSection } from '@/components/public/AmenitiesSection'
import { getPublicSessionsAction } from '@/app/actions/sessions'
import type { PlaySession, SessionOccurrence } from '@/lib/types/sessions'

/**
 * Bookable play sessions, rendered inline on the home page (this replaced the
 * standalone /sessions route). Each card is one specific date; full dates are
 * unclickable and expired ones stop being generated altogether.
 *
 * An async server component, so it must be rendered from a server component —
 * it cannot be nested inside a client tree.
 */
export async function SessionsSection() {
  const locale = await getLocale()
  const t = await getTranslations('Sessions')

  const sessions = await getPublicSessionsAction()

  // Flatten into individual dates, chronologically: a player thinks in "what
  // can I play this week", not "which recurring series exists".
  const cards: { session: PlaySession; occurrence: SessionOccurrence }[] = sessions
    .flatMap(({ session, occurrences }) => occurrences.map((occurrence) => ({ session, occurrence })))
    .sort((a, b) => a.occurrence.startsAt.localeCompare(b.occurrence.startsAt))

  // Cap the home page at a reasonable number of cards so a busy schedule
  // doesn't push the rest of the page far below the fold.
  const visible = cards.slice(0, 6)

  return (
    <ScrollReveal>
      <section id="sessions" className="relative pt-0 pb-28 sm:pb-32 bg-midnight overflow-hidden">

        {/* ── Full-bleed energetic title banner ── */}
        <div className="relative w-full py-14 sm:py-16 lg:py-20 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 40%, #A3FF12 100%)' }}
        >
          {/* Diagonal sport stripes */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="banner-stripes" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
                <rect width="2" height="48" fill="white" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#banner-stripes)" />
          </svg>

          {/* Scattered dot cluster — pickleball hole motif */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="banner-dots" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
                <circle cx="32" cy="32" r="3" fill="white" opacity="0.06" />
                <circle cx="12" cy="12" r="2" fill="white" opacity="0.04" />
                <circle cx="52" cy="14" r="2" fill="white" opacity="0.04" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#banner-dots)" />
          </svg>

          {/* Angled edge — bottom of banner clips into the midnight section */}
          <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-midnight"
            style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
          />

          <div className="relative z-10 text-center px-6 sm:px-10">
            <h2 className="font-bebas-neue font-bold text-6xl sm:text-7xl lg:text-8xl tracking-widest leading-none uppercase text-midnight drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]">
              {t('title')}
            </h2>
            <h2 className="font-bungee text-lg sm:text-xl lg:text-2xl text-midnight/80 tracking-wide mt-2">
              {t('reserveNow')}
            </h2>

            <h6 className="text-sm sm:text-base text-midnight/70 font-medium mt-3 max-w-md mx-auto">
              Pick a date, grab a spot, and come play. Spots are limited and go fast.
            </h6>

            {/* Amenities inline — towels/water & paddle rentals */}
            <div className="mt-8 mb-4">
              <AmenitiesSection />
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-14">
          {/* Prefetch session detail pages when this section enters the viewport */}
          {visible.length > 0 && (
            <SessionsPrefetcher
              hrefs={visible
                .filter(({ occurrence }) => !occurrence.isFull)
                .map(({ session, occurrence }) => `/sessions/${session.id}?date=${occurrence.date}`)}
            />
          )}

          {visible.length === 0 ? (
            // Nothing published (or every date has expired) — say so plainly
            // rather than rendering an empty grid.
            <div className="max-w-2xl mx-auto text-center rounded-2xl border border-lime/30 bg-lime/5 px-6 py-12 sm:py-16">
              <p className="font-bebas-neue text-4xl sm:text-5xl tracking-widest text-lime mb-3">
                {t('comingSoonTitle')}
              </p>
              <p className="text-white/80 text-base max-w-md mx-auto">{t('comingSoonBody')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map(({ session, occurrence }) => (
                  <SessionCard
                    key={`${session.id}-${occurrence.date}`}
                    session={session}
                    occurrence={occurrence}
                    locale={locale}
                  />
                ))}
              </div>

              {cards.length > visible.length && (
                <p className="text-center text-white/60 text-sm mt-8">
                  {t('moreDates', { count: cards.length - visible.length })}
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </ScrollReveal>
  )
}
