import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { ImageCarousel } from '@/components/public/ImageCarousel'
import { ExpeditionContent } from '@/components/public/ExpeditionContent'
import { SessionSignupForm } from '@/components/public/SessionSignupForm'
import { getPublicSessionAction } from '@/app/actions/sessions'
import { parseBlocks } from '@/lib/types/expedition-blocks'
import { isStripeConfigured } from '@/lib/stripe'
import {
  getSessionImages,
  formatSessionTimeRange,
  formatSessionDate,
  formatPrice,
} from '@/lib/sessions'
import type { Metadata } from 'next'

// Live spot counts — never served from a static cache.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ date?: string; canceled?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const result = await getPublicSessionAction(id)
  if (!result) return {}

  const { session } = result
  const title = locale === 'en' ? session.title_en : session.title_es
  const description = locale === 'en' ? session.description_en : session.description_es
  const images = getSessionImages(session)

  return {
    title: `${title} | NELL Pickleball Club`,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      images: images.length > 0 ? [{ url: images[0] }] : undefined,
    },
  }
}

export default async function SessionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { date: dateParam, canceled } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('Sessions')

  const result = await getPublicSessionAction(id)
  if (!result) notFound()

  const { session, occurrences } = result
  const title = locale === 'en' ? session.title_en : session.title_es
  const details = locale === 'en' ? session.details_en : session.details_es
  const blocks = parseBlocks(details)
  const images = getSessionImages(session)
  const timeLabel = formatSessionTimeRange(session.start_time, session.end_time, locale)
  const priceLabel =
    session.price_cents === 0 ? t('free') : formatPrice(session.price_cents, session.currency, locale)

  // Schema.org Event markup for the next upcoming date — makes the session
  // eligible for Google's Events rich result.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'
  const next = occurrences[0]
  const eventSchema = next
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: title,
        startDate: next.startsAt,
        endDate: next.endsAt,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        description: (locale === 'en' ? session.description_en : session.description_es) ?? undefined,
        image: images.length > 0 ? images : undefined,
        url: `${siteUrl}/${locale}/sessions/${session.id}`,
        offers: {
          '@type': 'Offer',
          price: (session.price_cents / 100).toFixed(2),
          priceCurrency: session.currency.toUpperCase(),
          availability: next.isFull
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
          url: `${siteUrl}/${locale}/sessions/${session.id}`,
        },
        location: {
          '@type': 'Place',
          name: session.location_name ?? 'NELL Pickleball Club',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Bavaro',
            addressRegion: 'La Altagracia',
            addressCountry: 'DO',
          },
        },
        organizer: { '@type': 'Organization', name: 'NELL Pickleball Club', url: siteUrl },
      }
    : null

  return (
    <main className="min-h-screen relative bg-dim">
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}

      {images.length > 0 && (
        <div className="relative h-[50vh] md:h-[62vh] overflow-hidden bg-charcoal">
          <ImageCarousel images={images} alt={title} showControls fit="cover" />
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/#sessions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-black/10 text-slate text-sm hover:text-midnight hover:border-black/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
              {t('backToSessions')}
            </Link>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-14 pb-28 md:pt-18 md:pb-36">
        <ScrollReveal>
          <h1
            className="font-bebas-neue text-[clamp(2.8rem,8vw,5.5rem)] leading-none tracking-widest mb-3"
            style={{ color: '#3c6799' }}
          >
            {title}
          </h1>

          {/* The always-rendered facts: schedule, price, capacity. These come
              from structured fields, not blocks, so they can never drift out of
              sync with what the booking actually enforces. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 font-bungee text-sm tracking-wide" style={{ color: '#5981a2' }}>
            <span>{timeLabel}</span>
            <span>{priceLabel}</span>
            <span>{t('maxPlayers', { count: session.capacity })}</span>
            {session.location_name && <span>{session.location_name}</span>}
          </div>

          {canceled && (
            <div className="mb-8 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('paymentCanceled')}
            </div>
          )}

          <div className="mb-12" />

          {blocks.length > 0 && <ExpeditionContent blocks={blocks} />}
        </ScrollReveal>

        {/* Upcoming dates at a glance */}
        {occurrences.length > 0 && (
          <ScrollReveal>
            <div className="mt-14">
              <h2 className="font-bungee text-xl text-midnight mb-4">{t('upcomingDates')}</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {occurrences.slice(0, 8).map((o) => (
                  <li
                    key={o.date}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                      o.isFull
                        ? 'border-black/10 bg-gray-100 text-gray-500'
                        : 'border-black/10 bg-white/80 text-midnight'
                    }`}
                  >
                    <span>{formatSessionDate(o.date, locale)}</span>
                    <span className={`font-semibold ${o.isFull ? 'text-red-600' : o.spotsLeft <= 3 ? 'text-orange-700' : 'text-green-700'}`}>
                      {o.isFull ? t('soldOut') : t('spotsLeft', { count: o.spotsLeft })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        )}

        <div className="mt-14 md:mt-16">
          <ScrollReveal>
            <SessionSignupForm
              session={session}
              occurrences={occurrences}
              initialDate={dateParam}
              stripeAvailable={isStripeConfigured()}
            />
          </ScrollReveal>
        </div>
      </div>
    </main>
  )
}
