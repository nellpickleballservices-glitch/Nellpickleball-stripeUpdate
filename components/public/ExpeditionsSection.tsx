import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { ImageCarousel } from '@/components/public/ImageCarousel'
import { getExpeditionImages } from '@/lib/expeditions'
import { getPublishedExpeditionsAction } from '@/app/actions/admin/expeditions'

function formatDateRange(start: string, end: string, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  const lang = locale === 'en' ? 'en-US' : 'es-DO'
  const s = new Date(start + 'T00:00:00').toLocaleDateString(lang, opts)
  const e = new Date(end + 'T00:00:00').toLocaleDateString(lang, opts)
  return `${s} – ${e}`
}

function getDurationDays(start: string, end: string): number {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / 86_400_000) + 1
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(expiresAt + 'T00:00:00').getTime() < today.getTime()
}

export async function ExpeditionsSection() {
  const locale = await getLocale()
  const t = await getTranslations('Expeditions')
  const expeditions = await getPublishedExpeditionsAction()

  if (expeditions.length === 0) return null

  return (
    <section
      className="relative pb-24 md:pb-32 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #EFF8F4 0%, #FAF6ED 45%, #E5F2EE 100%)',
      }}
    >
      {/* Soft beach accents — lime sun, turquoise water, warm sunset hint */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-lime/20 blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-turquoise/25 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-sunset/10 blur-[120px]" />
      </div>

      {/* Wave decoration — stretched across the full width of the section.
          The negative bottom is in vw so it scales with the viewport (same
          proportional offset on every screen). Capped at ~15vw because the
          wave crests live in the lower half of the SVG's viewBox — pushing
          further would hide them below the section. 15vw ≈ 216px at desktop. */}
      <div className="pointer-events-none absolute -bottom-[15vw] inset-x-0 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/siteImages/favicon/wave_design.svg"
          alt=""
          aria-hidden="true"
          className="block w-full h-auto"
        />
      </div>

      {/* Beach-banner header — full section width, flush with the section's
          top edge. Lives outside the max-w-7xl wrapper below so it can stretch
          edge to edge regardless of viewport size. */}
      <div className="relative z-10 w-full h-[260px] sm:h-[320px] md:h-[380px] lg:h-[420px] overflow-hidden">
        {/* Background photo */}
        <Image
          src="/images/siteImages/beach_banner.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Dark gradient overlay — keeps the white text readable on any
            part of the photo (bright sky at top, darker sand at bottom). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/30 to-black/20"
        />

        {/* Centered content sits on top of the photo + overlay */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 sm:px-10">
          <ScrollReveal>
            <h2 className="font-bebas-neue text-[clamp(3rem,9vw,6.5rem)] leading-tight text-white tracking-widest drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              {t('sectionTitle')}
            </h2>
            <p className="mt-3 text-white/90 text-base sm:text-lg max-w-2xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {t('sectionSubtitle')}
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Cards grid wrapper — re-applies the horizontal padding + max width
          that the section itself no longer carries. */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 mt-12 md:mt-16">
        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {expeditions.map((exp, i) => {
            const title = locale === 'en' ? exp.title_en : exp.title_es
            const description = locale === 'en' ? exp.description_en : exp.description_es
            const images = getExpeditionImages(exp)
            const expired = isExpired(exp.expires_at)

            return (
              <ScrollReveal key={exp.id} delay={i * 0.1}>
                <Link
                  href={`/expeditions/${exp.id}`}
                  className="group block rounded-[12px] overflow-hidden bg-white shadow-md hover:shadow-xl border border-white hover:border-lime/40 transition-all duration-300"
                >
                  {/* Header image — auto-cycling carousel.
                      aspect-[4/3] gives the photo more vertical presence so
                      each card reads as a taller portrait-leaning rectangle. */}
                  <div className="relative h-56 overflow-hidden">
                    <ImageCarousel
                      images={images}
                      alt={title}
                      imgClassName={`transition-transform duration-500 group-hover:scale-105 ${expired ? 'grayscale opacity-70' : ''}`}
                    />
                    {expired && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/90 text-white tracking-wide">
                        {t('registrationClosed')}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    {/* Date & duration */}
                    <h5 className="text-turquoise text-xs font-semibold tracking-wide">
                      {formatDateRange(exp.start_date, exp.end_date, locale)}
                    </h5>
                    <p className="text-slate/70 text-[11px] mt-0.5 mb-2">
                      {t('duration', { days: getDurationDays(exp.start_date, exp.end_date) })}
                    </p>
                    <h3 className="font-bungee text-midnight text-base leading-snug group-hover:text-lime transition-colors mb-1.5">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-slate text-xs leading-relaxed line-clamp-2">
                        {description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs font-medium" style={{ color: '#0891B2' }}>
                      <span>{t('learnMore')}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
