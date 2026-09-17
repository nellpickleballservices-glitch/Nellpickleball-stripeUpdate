import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { ImageCarousel } from '@/components/public/ImageCarousel'
import { SpecialEventSignupForm } from '@/components/public/SpecialEventSignupForm'
import { getPublicSpecialEventAction } from '@/app/actions/special-events'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cancelPendingSpecialEventSignupAction } from '@/app/actions/special-event-signup'
import { isStripeConfigured } from '@/lib/stripe'
import { formatSessionDate, formatSessionTimeRange, formatPrice } from '@/lib/sessions'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string; locale: string }>
  searchParams: Promise<{ canceled?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const result = await getPublicSpecialEventAction(id)
  if (!result) return {}

  const { event } = result
  const title = locale === 'en' ? event.title_en : event.title_es
  const description = locale === 'en' ? event.description_en : event.description_es
  const image = event.image_urls?.[0] ?? event.image_url

  return {
    title: `${title} | NELL Pickleball Club`,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  }
}

export default async function SpecialEventDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { canceled } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('SpecialEvents')

  // If the user came back from Stripe without paying, cancel their pending
  // signup so the spot is released immediately (not after the 30-min hold).
  if (canceled) {
    await cancelPendingSpecialEventSignupAction(id)
  }

  const result = await getPublicSpecialEventAction(id)
  if (!result) notFound()

  const { event, spotsLeft, isFull, promoActive, effectivePriceCents } = result

  const title = locale === 'en' ? event.title_en : event.title_es
  const description = locale === 'en' ? event.description_en : event.description_es
  const details = locale === 'en' ? event.details_en : event.details_es
  const images = event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : []

  const dateLabel = formatSessionDate(event.event_date, locale)
  const timeLabel = formatSessionTimeRange(event.start_time, event.end_time, locale)

  // Get logged-in user info for the signup form
  let formUser: { name: string; email: string } | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email.split('@')[0]
      formUser = { name, email: user.email }
    }
  } catch { /* not logged in */ }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    startDate: `${event.event_date}T${event.start_time}-04:00`,
    endDate: `${event.event_date}T${event.end_time}-04:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: description ?? undefined,
    image: images.length > 0
      ? images.map((src) => (src.startsWith('http') ? src : `${siteUrl}${src}`))
      : undefined,
    url: `${siteUrl}/${locale}/special-events/${event.id}`,
    location: event.location_name
      ? {
          '@type': 'Place',
          name: event.location_name,
        }
      : {
          '@type': 'Place',
          name: 'NELL Pickleball Club',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Bavaro',
            addressRegion: 'La Altagracia',
            addressCountry: 'DO',
          },
        },
    organizer: {
      '@type': 'Organization',
      name: 'NELL Pickleball Club',
      url: siteUrl,
    },
    ...(event.price_cents > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: (effectivePriceCents / 100).toFixed(2),
            priceCurrency: event.currency.toUpperCase(),
            availability: isFull
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/InStock',
          },
        }
      : {}),
  }

  return (
    <main className="min-h-screen relative bg-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />

      {/* Hero */}
      {images.length > 0 && (
        <div className="relative h-[65vh] md:h-[78vh] overflow-hidden bg-charcoal">
          <ImageCarousel images={images} alt={title} showControls fit="contain" thumbnails />

          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-black/10 text-slate text-sm hover:text-midnight hover:border-black/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
              {t('backToHome')}
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-14 pb-28 md:pt-18 md:pb-36">
        <ScrollReveal>
          {/* Badge */}
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 text-white text-xs font-bold uppercase tracking-wider">
              {t('badge')}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-bebas-neue text-[clamp(2.8rem,8vw,5.5rem)] leading-none tracking-widest mb-3 text-midnight">
            {title}
          </h1>

          {/* Date & Time & Location */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate mb-8">
            <span className="inline-flex items-center gap-2 text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-600">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
              </svg>
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2 text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-600">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
              </svg>
              {timeLabel}
            </span>
            {event.location_name && (
              <span className="inline-flex items-center gap-2 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-600">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                </svg>
                {event.location_name}
              </span>
            )}
          </div>

          {/* Pricing & Availability */}
          <div className="flex flex-wrap items-center gap-4 mb-10 p-5 rounded-2xl bg-white/60 backdrop-blur-sm border border-purple-200/30">
            {promoActive ? (
              <>
                <span className="font-bold text-2xl text-purple-600">
                  {formatPrice(effectivePriceCents, event.currency, locale)}
                </span>
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(event.price_cents, event.currency, locale)}
                </span>
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 text-sm font-bold uppercase tracking-wide border border-purple-200">
                  {t('earlyBird')}
                </span>
              </>
            ) : (
              <span className="font-bold text-2xl text-green-600">
                {event.price_cents === 0 ? t('free') : formatPrice(event.price_cents, event.currency, locale)}
              </span>
            )}

            <span className="ml-auto">
              {isFull ? (
                <span className="inline-flex items-center gap-2 text-red-600 font-semibold">
                  {t('soldOut')}
                </span>
              ) : (
                <span className={`font-medium ${spotsLeft <= 5 ? 'text-orange-700' : 'text-green-700'}`}>
                  {t('spotsLeft', { count: spotsLeft })}
                </span>
              )}
            </span>
          </div>

          {/* Payment methods */}
          {event.price_cents > 0 && (event.allow_stripe || event.allow_cash) && (
            <div className="flex flex-wrap items-center gap-3 mb-10">
              {event.allow_stripe && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-200/60">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM3 13.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.75-.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" />
                  </svg>
                  {t('payOnline')}
                </span>
              )}
              {event.allow_cash && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200/60">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 1a3 3 0 1 1-6 0h6ZM2 8v1c1.732 0 3-1.268 3-3H4a1 1 0 0 0-1 1Zm14-1a3 3 0 0 1-3 3v-1h2a1 1 0 0 0 1-1Zm0 5a3 3 0 0 0-3-3v1h2a1 1 0 0 1 1 1Zm-14 1a3 3 0 0 0 3-3V9H4a1 1 0 0 0-1 1v1Zm5 2a3 3 0 0 0 6 0H7Z" clipRule="evenodd" />
                  </svg>
                  {t('payCash')}
                </span>
              )}
            </div>
          )}

          {/* Promo countdown */}
          {promoActive && event.promo_expires_at && (
            <p className="text-sm text-purple-600 font-medium mb-10">
              {t('promoEnds', {
                date: new Date(event.promo_expires_at).toLocaleDateString(
                  locale === 'en' ? 'en-US' : 'es-DO',
                  { month: 'short', day: 'numeric' }
                ),
              })}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="text-slate text-lg leading-relaxed mb-10">{description}</p>
          )}

          {/* Details (rich text content) */}
          {details && (
            <div className="prose prose-slate max-w-none whitespace-pre-line">
              {details}
            </div>
          )}
        </ScrollReveal>

        {canceled && (
          <div className="mb-8 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            Your payment was canceled. You can try again below.
          </div>
        )}

        <div className="mt-14 md:mt-16">
          <ScrollReveal>
            <SpecialEventSignupForm
              eventId={event.id}
              priceCents={event.price_cents}
              effectivePriceCents={effectivePriceCents}
              currency={event.currency}
              allowStripe={event.allow_stripe}
              allowCash={event.allow_cash}
              isFull={isFull}
              stripeAvailable={isStripeConfigured()}
              user={formUser}
            />
          </ScrollReveal>
        </div>
      </div>
    </main>
  )
}
