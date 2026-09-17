import { getLocale, getTranslations } from 'next-intl/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { SpecialEventCard } from '@/components/public/SpecialEventCard'
import { getPublicSpecialEventsAction } from '@/app/actions/special-events'
import { getSpecialEventsBannerPublic } from '@/app/actions/admin/settings'

/**
 * Special events section — renders above sessions on the home page.
 * Completely disappears when there are no published future events.
 * Banner config is managed via CMS (app_config), independent of individual events.
 */
export async function SpecialEventsSection() {
  const locale = await getLocale()
  const t = await getTranslations('SpecialEvents')

  const events = await getPublicSpecialEventsAction()

  // No events = no section at all (banner only shows with active events)
  if (events.length === 0) return null

  const banner = await getSpecialEventsBannerPublic()

  const heroTitle = locale === 'en'
    ? (banner.title_en || t('title'))
    : (banner.title_es || t('title'))
  const heroSubtitle = locale === 'en'
    ? (banner.subtitle_en || t('subtitle'))
    : (banner.subtitle_es || t('subtitle'))
  const heroImage = banner.image_url || null

  return (
    <ScrollReveal>
      <section id="special-events" className="relative pb-28 sm:pb-32 bg-midnight overflow-hidden">

        {/* ── Hero/banner ── */}
        <div className="relative w-full overflow-hidden" style={{ height: 'clamp(400px, 40vw, 600px)' }}>
          {heroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="!absolute !inset-0 !w-full !h-full !max-w-none !object-cover"
              />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
            </>
          ) : (
            <div
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #22c55e, #3b82f6)' }}
            />
          )}

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 sm:px-10">
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
