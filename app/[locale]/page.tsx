import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import WelcomeBanner from './WelcomeBanner'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { Footer } from '@/components/Footer'
import { ChatWidgetLoader } from '@/components/chatbot/ChatWidgetLoader'
import { SessionsSection } from '@/components/public/SessionsSection'
import { AboutSection } from '@/components/public/AboutSection'
import { ValuesBanner } from '@/components/public/ValuesBanner'
import { ExpeditionsSection } from '@/components/public/ExpeditionsSection'
import { HeroVideo } from '@/components/effects/HeroVideo'
import { getHeroLocations } from '@/lib/queries/hero-locations'
import type { Metadata } from 'next'

interface HomePageProps {
  searchParams: Promise<{ welcome?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Home')

  const title = `NELL Pickleball Club | ${locale === 'en' ? 'Bavaro, Dominican Republic' : 'Bavaro, Republica Dominicana'}`
  const description = t('heroSubheadline')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      siteName: 'NELL Pickleball Club',
      images: [{ url: '/images/siteImages/players_in_action.jpeg', width: 1200, height: 630, alt: 'NELL Pickleball Club' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/siteImages/players_in_action.jpeg'],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        es: '/es',
      },
    },
  }
}

async function HomePage({ searchParams }: HomePageProps) {
  const t = await getTranslations('Home')
  const locale = await getLocale()
  const params = await searchParams
  const showWelcome = params.welcome === '1'

  const heroLocations = await getHeroLocations()

  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null
  let firstName = ''

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      if (showWelcome) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single()
        firstName = profile?.first_name ?? user.user_metadata?.first_name ?? user.email?.split('@')[0] ?? ''
      }

    }
  } catch {
    // Network error reaching Supabase — render as logged-out
  }

  return (
    <MotionProvider>
      <main className="min-h-dvh bg-midnight">
        {showWelcome && firstName && <WelcomeBanner firstName={firstName} />}

        {/* -- HERO --
            Mobile: flex column with content stacked at the bottom (main content
            then locations) so they sit close together over the video.
            Desktop (lg+): main content stays pinned to the bottom-left, with
            the locations list anchored to the right via absolute positioning. */}
        <section className="relative h-[75vh] overflow-hidden flex flex-col justify-end lg:block">

          {/* Background video with dark overlay */}
          <HeroVideo />

          {/* Content — bottom on mobile (above locations), bottom-left on desktop.
              pb-20 on mobile pushes the main content higher and opens up the
              gap between it and the locations card below. */}
          <div className="relative z-[10] w-full px-6 sm:px-12 lg:px-20 pb-20 lg:pt-[15vh] lg:pb-[182px] lg:absolute lg:bottom-0 lg:left-0">
            <div className="max-w-2xl">
              {/* Main headline */}
              <ScrollReveal delay={0.15}>
                <h1 className="font-bebas-neue text-[clamp(3rem,9vw,6rem)] leading-[1] tracking-widest text-offwhite mb-5 sm:mb-3 py-1 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                  {t('heroHeadline')}
                </h1>
              </ScrollReveal>

              {/* Club name */}
              <ScrollReveal delay={0.3}>
                <p className="font-bungee text-[clamp(1.25rem,3.2vw,2rem)] leading-[1.2] text-white tracking-[0.3em] uppercase mb-2 pr-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                  {t('title')}&nbsp;{t('subtitle')}
                </p>
              </ScrollReveal>

              {/* Accent divider — sits directly under the club name like an
                  underline. Longer + brighter so it reads as a deliberate
                  brand mark rather than a hairline. */}
              <ScrollReveal delay={0.45}>
                <div className="w-48 sm:w-64 lg:w-80 h-0.5 sm:h-1 rounded-full bg-gradient-to-r from-lime via-lime to-lime/30 mb-10 sm:mb-8" />
              </ScrollReveal>

              <ScrollReveal delay={0.75}>
                <span className="font-bebas-neue text-3xl sm:text-3xl lg:text-4xl tracking-wider uppercase text-lime drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                  {t('heroNoMembership')}
                </span>
              </ScrollReveal>
            </div>
          </div>

          {/* Locations list.
              Mobile: sits directly below the main content (parent uses
              justify-end, so both blocks stack at the bottom of the hero).
              Desktop: absolutely positioned on the right side, vertically centered. */}
          {heroLocations.length > 0 && (
            <div className="relative z-[10] w-full lg:w-auto px-6 sm:px-12 lg:px-20 pb-8 lg:pb-0 lg:absolute lg:right-0 lg:top-[4vh]">
              <ScrollReveal delay={0.6}>
                <div className="inline-block px-5 py-4 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                  <p className="font-bebas-neue text-lime text-base sm:text-base tracking-[0.25em] uppercase mb-2 whitespace-nowrap">
                    {t('heroLocationsTitle')}
                  </p>
                  <ul className="space-y-1.5">
                    {heroLocations.map((loc) => (
                      <li
                        key={loc.id}
                        className="flex items-center gap-2 text-offwhite text-lg sm:text-lg font-medium tracking-wide lg:whitespace-nowrap"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4 text-lime shrink-0"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.013 3.5-4.799 3.5-8.327a8.25 8.25 0 00-16.5 0c0 3.527 1.557 6.314 3.5 8.328a19.583 19.583 0 002.683 2.281 16.975 16.975 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{loc.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          )}
        </section>

        {/* -- VALUES BANNER — compact, right under the hero -- */}
        <ValuesBanner />

        {/* -- OPEN PLAY SESSIONS — leads with the amenities cards, then the
              bookable dates. Took over the slot the Packages & Pricing section
              used to occupy; that section's pricing content is commented out
              inside components/public/PackagesSection.tsx. -- */}
        <SessionsSection />

        {/* -- EXPEDITIONS -- */}
        <ExpeditionsSection />

        {/* -- ABOUT (Vision + Mission) — moved below the offerings -- */}
        <AboutSection />
      </main>
      <Footer />
      <ChatWidgetLoader locale={locale} />
    </MotionProvider>
  )
}

export default HomePage
