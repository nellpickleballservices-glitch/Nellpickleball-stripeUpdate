import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getSignupSummaryAction } from '@/app/actions/sessions'
import { formatSessionDate, formatSessionTimeRange } from '@/lib/sessions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ signup?: string }>
}

export default async function SessionSuccessPage({ searchParams }: PageProps) {
  const { signup } = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('Sessions')

  const summary = signup ? await getSignupSummaryAction(signup) : null

  // The webhook is what marks a sign-up paid, and it can land a moment after
  // the browser gets redirected here. A still-pending row is therefore normal,
  // not an error — say "processing" rather than alarming the person who just paid.
  const settled = summary?.status === 'paid'

  return (
    <main className="min-h-screen bg-dim grid place-items-center px-6 py-24">
      <div className="max-w-lg w-full text-center rounded-2xl border border-black/10 bg-white/85 backdrop-blur-sm p-8 sm:p-10 shadow-sm">
        <div
          className={`mx-auto mb-6 grid place-items-center w-16 h-16 rounded-full ${
            settled ? 'bg-lime/20 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {settled ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <h1 className="font-bebas-neue text-4xl tracking-wide text-midnight mb-3">
          {settled ? t('paidTitle') : t('processingTitle')}
        </h1>

        {summary ? (
          <>
            <p className="text-slate text-base mb-1">{summary.sessionTitle}</p>
            <p className="text-slate text-sm">
              {formatSessionDate(summary.sessionDate, locale)}
              {summary.startTime && (
                <> · {formatSessionTimeRange(summary.startTime, summary.endTime, locale)}</>
              )}
            </p>
            <p className="text-slate text-base mt-5">
              {settled ? t('paidBody') : t('processingBody')}
            </p>
          </>
        ) : (
          <p className="text-slate text-base">{t('processingBody')}</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/#sessions"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-midnight text-white text-sm font-semibold hover:bg-midnight/90 transition-colors"
          >
            {t('backToSessions')}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-black/10 text-midnight text-sm font-semibold hover:bg-black/5 transition-colors"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </main>
  )
}
