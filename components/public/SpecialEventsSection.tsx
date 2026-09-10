import { getLocale, getTranslations } from 'next-intl/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { SpecialEventCard } from '@/components/public/SpecialEventCard'
import { getPublicSpecialEventsAction } from '@/app/actions/special-events'

/**
 * Special events section — renders above sessions on the home page.
 * Completely disappears when there are no published future events.
 */
export async function SpecialEventsSection() {
  const locale = await getLocale()
  const t = await getTranslations('SpecialEvents')

  const events = await getPublicSpecialEventsAction()

  // No events = no section at all
  if (events.length === 0) return null

  // Use the first event's hero settings for the banner, or fall back to defaults
  const heroEvent = events[0].event
  const heroTitle = locale === 'en'
    ? (heroEvent.hero_title_en || t('title'))
    : (heroEvent.hero_title_es || t('title'))
  const heroSubtitle = locale === 'en'
    ? (heroEvent.hero_subtitle_en || t('subtitle'))
    : (heroEvent.hero_subtitle_es || t('subtitle'))
  const heroImage = heroEvent.hero_image_url

  return (
    <ScrollReveal>
      <section id="special-events" className="relative pt-0 pb-28 sm:pb-32 bg-midnight overflow-hidden">

        {/* ── Hero/banner ── */}
        <div className="relative w-full py-14 sm:py-16 lg:py-20 overflow-hidden"
          style={{
            background: heroImage
              ? undefined
              : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 30%, #F59E0B 70%, #EF4444 100%)',
          }}
        >
          {/* Background image if set */}
          {heroImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-purple-800/60 to-amber-900/70" />
            </>
          )}

          {/* Sparkle/star pattern overlay */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="se-sparkles" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <circle cx="40" cy="40" r="1.5" fill="white" opacity="0.15" />
                <circle cx="15" cy="20" r="1" fill="white" opacity="0.1" />
                <circle cx="65" cy="60" r="1" fill="white" opacity="0.1" />
                <circle cx="25" cy="65" r="0.8" fill="white" opacity="0.08" />
                <circle cx="55" cy="15" r="0.8" fill="white" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#se-sparkles)" />
          </svg>

          {/* Angled bottom edge */}
          <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-midnight"
            style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
          />

          <div className="relative z-10 text-center px-6 sm:px-10">
            <h2 className="font-bebas-neue font-bold text-6xl sm:text-7xl lg:text-8xl tracking-widest leading-none uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              {heroTitle}
            </h2>
            <h3 className="font-bungee text-lg sm:text-xl lg:text-2xl text-white/80 tracking-wide mt-2">
              {heroSubtitle}
            </h3>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(({ event, spotsLeft, isFull, promoActive, effectivePriceCents }) => (
              <SpecialEventCard
                key={event.id}
                event={event}
                spotsLeft={spotsLeft}
                isFull={isFull}
                promoActive={promoActive}
                effectivePriceCents={effectivePriceCents}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  )
}
