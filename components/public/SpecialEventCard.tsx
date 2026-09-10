import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { formatSessionDate, formatSessionTimeRange, formatPrice } from '@/lib/sessions'
import type { SpecialEvent } from '@/lib/types/special-events'

interface Props {
  event: SpecialEvent
  spotsLeft: number
  isFull: boolean
  promoActive: boolean
  effectivePriceCents: number
  locale: string
}

export async function SpecialEventCard({
  event,
  spotsLeft,
  isFull,
  promoActive,
  effectivePriceCents,
  locale,
}: Props) {
  const t = await getTranslations('SpecialEvents')

  const title = locale === 'en' ? event.title_en : event.title_es
  const description = locale === 'en' ? event.description_en : event.description_es
  const cover = event.image_urls?.[0] ?? event.image_url

  const dateLabel = formatSessionDate(event.event_date, locale)
  const timeLabel = formatSessionTimeRange(event.start_time, event.end_time, locale)

  // Card size classes
  const sizeClasses =
    event.card_size === 'featured'
      ? 'sm:col-span-2 lg:col-span-3'
      : event.card_size === 'large'
      ? 'sm:col-span-2'
      : ''

  const imageHeight =
    event.card_size === 'featured' ? 'h-72 sm:h-80' : event.card_size === 'large' ? 'h-64' : 'h-56'

  const body = (
    <>
      {cover && (
        <div className={`relative ${imageHeight} overflow-hidden bg-charcoal`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isFull ? 'grayscale opacity-60' : 'group-hover:scale-105'
            }`}
          />
          {/* Special event badge */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg">
            {t('badge')}
          </div>
          {isFull && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <span className="font-bungee text-white text-lg tracking-widest uppercase">
                {t('soldOut')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-3">
        {/* Date */}
        <div>
          <p className="font-bungee text-xs uppercase tracking-widest text-purple-600 inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
            </svg>
            {dateLabel}
          </p>
          <h3 className={`font-bebas-neue tracking-wide text-midnight mt-1 ${
            event.card_size === 'featured' ? 'text-4xl' : event.card_size === 'large' ? 'text-3xl' : 'text-2xl'
          }`}>
            {title}
          </h3>
        </div>

        {/* Time + Location */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate">
          <span className="inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            {timeLabel}
          </span>
          {event.location_name && (
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.274 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
              </svg>
              {event.location_name}
            </span>
          )}
        </div>

        {description && (
          <p className={`text-sm text-slate ${event.card_size === 'featured' ? 'line-clamp-4' : 'line-clamp-2'}`}>
            {description}
          </p>
        )}

        {/* Pricing */}
        <div className="flex flex-wrap items-center gap-3">
          {promoActive ? (
            <>
              <span className="font-bold text-lg text-purple-600">
                {formatPrice(effectivePriceCents, event.currency, locale)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(event.price_cents, event.currency, locale)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 text-xs font-bold uppercase tracking-wide border border-purple-200">
                {t('earlyBird')}
              </span>
            </>
          ) : (
            <span className="font-bold text-lg text-green-600">
              {event.price_cents === 0 ? t('free') : formatPrice(event.price_cents, event.currency, locale)}
            </span>
          )}
        </div>

        {/* Payment options */}
        {event.price_cents > 0 && (event.allow_stripe || event.allow_cash) && (
          <div className="flex flex-wrap items-center gap-2">
            {event.allow_stripe && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200/60">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM3 13.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.75-.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" />
                </svg>
                {t('payOnline')}
              </span>
            )}
            {event.allow_cash && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 1a3 3 0 1 1-6 0h6ZM2 8v1c1.732 0 3-1.268 3-3H4a1 1 0 0 0-1 1Zm14-1a3 3 0 0 1-3 3v-1h2a1 1 0 0 0 1-1Zm0 5a3 3 0 0 0-3-3v1h2a1 1 0 0 1 1 1Zm-14 1a3 3 0 0 0 3-3V9H4a1 1 0 0 0-1 1v1Zm5 2a3 3 0 0 0 6 0H7Z" clipRule="evenodd" />
                </svg>
                {t('payCash')}
              </span>
            )}
          </div>
        )}

        {/* Promo countdown hint */}
        {promoActive && event.promo_expires_at && (
          <p className="text-xs text-purple-600 font-medium">
            {t('promoEnds', {
              date: new Date(event.promo_expires_at).toLocaleDateString(
                locale === 'en' ? 'en-US' : 'es-DO',
                { month: 'short', day: 'numeric' }
              ),
            })}
          </p>
        )}

        {/* Availability */}
        {isFull ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
            {t('soldOut')}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-medium ${spotsLeft <= 5 ? 'text-orange-700' : 'text-green-700'}`}>
              {t('spotsLeft', { count: spotsLeft })}
            </span>
            <span className="font-bungee text-xs uppercase tracking-widest text-midnight group-hover:text-purple-600 transition-colors">
              {t('signUp')} →
            </span>
          </div>
        )}
      </div>
    </>
  )

  const shellCls =
    `block rounded-2xl overflow-hidden border bg-white/90 backdrop-blur-sm shadow-sm transition-all ${sizeClasses}`

  if (isFull) {
    return (
      <div
        aria-disabled="true"
        className={`${shellCls} border-black/10 cursor-not-allowed select-none opacity-90`}
      >
        {body}
      </div>
    )
  }

  return (
    <Link
      href={`/special-events/${event.id}`}
      className={`group ${shellCls} border-purple-200/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10`}
    >
      {body}
    </Link>
  )
}
