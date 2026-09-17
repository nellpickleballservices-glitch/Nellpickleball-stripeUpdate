import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { ImageCarousel } from '@/components/public/ImageCarousel'
import { ExpeditionContent } from '@/components/public/ExpeditionContent'
import { ExpeditionInterestForm } from '@/components/public/ExpeditionInterestForm'
import { getExpeditionImages } from '@/lib/expeditions'
import { getExpeditionByIdAction } from '@/app/actions/admin/expeditions'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseBlocks } from '@/lib/types/expedition-blocks'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const expedition = await getExpeditionByIdAction(id)
  if (!expedition) return {}

  const title = locale === 'en' ? expedition.title_en : expedition.title_es
  const description = locale === 'en' ? expedition.description_en : expedition.description_es

  return {
    title: `${title} | NELL Pickleball Club`,
    description: description ?? undefined,
    openGraph: {
      title,
      description: description ?? undefined,
      images: [{ url: expedition.image_url }],
    },
  }
}

function formatDateRange(start: string, end: string, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
  const lang = locale === 'en' ? 'en-US' : 'es-DO'
  const s = new Date(start + 'T00:00:00').toLocaleDateString(lang, opts)
  const e = new Date(end + 'T00:00:00').toLocaleDateString(lang, opts)
  return `${s} – ${e}`
}

export default async function ExpeditionDetailPage({ params }: PageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('Expeditions')

  const expedition = await getExpeditionByIdAction(id)
  if (!expedition) notFound()

  const title = locale === 'en' ? expedition.title_en : expedition.title_es
  const details = locale === 'en' ? expedition.details_en : expedition.details_es
  const blocks = parseBlocks(details)
  const images = getExpeditionImages(expedition)

  // Get logged-in user info for the interest form
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expired = expedition.expires_at
    ? new Date(expedition.expires_at + 'T00:00:00').getTime() < today.getTime()
    : false

  // Schema.org Event markup — makes this expedition eligible for Google's
  // Events rich result and surfaces the right metadata to social platforms.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'
  const descriptionText = locale === 'en' ? expedition.description_en : expedition.description_es
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    startDate: `${expedition.start_date}T08:00:00-04:00`,
    endDate: `${expedition.end_date}T22:00:00-04:00`,
    eventStatus: expired
      ? 'https://schema.org/EventScheduled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: descriptionText ?? undefined,
    image: images.length > 0
      ? images.map((src) => (src.startsWith('http') ? src : `${siteUrl}${src}`))
      : undefined,
    url: `${siteUrl}/${locale}/expeditions/${expedition.id}`,
    location: {
      '@type': 'Place',
      name: 'NELL Pickleball Club',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bavaro',
        addressRegion: 'La Altagracia',
        addressCountry: 'DO',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 18.6872,
        longitude: -68.4543,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'NELL Pickleball Club',
      url: siteUrl,
    },
  }

  return (
    <main className="min-h-screen relative bg-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      {/* Hero — full-bleed auto-cycling carousel flush with the navbar. */}
      <div className="relative h-[65vh] md:h-[78vh] overflow-hidden bg-charcoal">
        <ImageCarousel images={images} alt={title} showControls fit="contain" thumbnails />

        {/* Back link */}
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

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-14 pb-28 md:pt-18 md:pb-36">
        <ScrollReveal>
          {/* Title */}
          <h1 className="font-bebas-neue text-[clamp(2.8rem,8vw,5.5rem)] leading-none tracking-widest mb-3" style={{ color: '#3c6799' }}>
            {title}
          </h1>

          {/* Duration */}
          <h2 className="font-bungee text-lg md:text-xl mb-6 tracking-wide" style={{ color: '#5981a2' }}>
            {formatDateRange(expedition.start_date, expedition.end_date, locale)}
          </h2>

          {expired && (
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
              </svg>
              {t('registrationClosed')}
            </div>
          )}

          <div className="mb-12" />

          {/* Block-based detail content */}
          {blocks.length > 0 ? (
            <ExpeditionContent blocks={blocks} />
          ) : (
            <p className="text-slate text-lg">{t('noDetails')}</p>
          )}
        </ScrollReveal>

        {/* Interest form — only when the expedition is still open for sign-ups */}
        {!expired && (
          <div className="mt-16 md:mt-20">
            <ScrollReveal>
              <ExpeditionInterestForm expeditionId={expedition.id} user={formUser} />
            </ScrollReveal>
          </div>
        )}
      </div>
    </main>
  )
}
