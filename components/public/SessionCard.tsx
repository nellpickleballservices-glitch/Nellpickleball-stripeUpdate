import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { formatSessionDate, formatSessionTimeRange, formatPrice } from '@/lib/sessions'
import type { PlaySession, SessionOccurrence } from '@/lib/types/sessions'

interface Props {
  session: PlaySession
  occurrence: SessionOccurrence
  locale: string
}

/**
 * One bookable date. A full card is deliberately rendered as a <div>, not a
 * disabled <a> — there is nowhere useful to go, so it should not be focusable,
 * hoverable, or clickable at all.
 */
export async function SessionCard({ session, occurrence, locale }: Props) {
  const t = await getTranslations('Sessions')

  const title = locale === 'en' ? session.title_en : session.title_es
  const description = locale === 'en' ? session.description_en : session.description_es
  const cover = session.image_urls?.[0] ?? session.image_url

  const dateLabel = formatSessionDate(occurrence.date, locale)
  const timeLabel = formatSessionTimeRange(session.start_time, session.end_time, locale)
  const priceLabel =
    session.price_cents === 0 ? t('free') : formatPrice(session.price_cents, session.currency, locale)

  const body = (
    <>
      {cover && (
        <div className="relative h-56 overflow-hidden bg-charcoal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              occurrence.isFull ? 'grayscale opacity-60' : 'group-hover:scale-105'
            }`}
          />
          {occurrence.isFull && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <span className="font-bungee text-white text-lg tracking-widest uppercase">
                {t('soldOut')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-3">
        <div>
          <p className="font-bungee text-xs uppercase tracking-widest text-[#0284C7] inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
            </svg>
            {dateLabel}
          </p>
          <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mt-1">{title}</h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-1 text-sm text-slate">
          <span className="inline-flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            {timeLabel}
          </span>
          <span className="font-bold text-lg text-green-600">{priceLabel}</span>
        </div>

        {description && <p className="text-sm text-slate line-clamp-2">{description}</p>}

        {/* Availability — the number that decides whether this card is usable. */}
        {occurrence.isFull ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-600">
            {t('soldOut')}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className={`text-sm font-medium ${occurrence.spotsLeft <= 3 ? 'text-orange-700' : 'text-green-700'}`}>
              {t('spotsLeft', { count: occurrence.spotsLeft })}
            </span>
            <span className="font-bungee text-xs uppercase tracking-widest text-midnight group-hover:text-[#0284C7] transition-colors">
              {t('signUp')} →
            </span>
          </div>
        )}
      </div>
    </>
  )

  const shellCls =
    'block rounded-2xl overflow-hidden border bg-white/90 backdrop-blur-sm shadow-sm transition-all'

  if (occurrence.isFull) {
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
      href={`/sessions/${session.id}?date=${occurrence.date}`}
      className={`group ${shellCls} border-black/10 hover:border-[#0ea5e9]/40 hover:shadow-lg`}
    >
      {body}
    </Link>
  )
}
