import { getTranslations } from 'next-intl/server'
import { SectionReveal } from '@/components/motion/SectionReveal'

export async function AboutSection() {
  const t = await getTranslations('Public')

  return (
    <SectionReveal direction="up">
      <section id="about" className="relative w-full py-20 sm:py-24 overflow-hidden">
        {/* Background accent glows — lime on the left, turquoise on the right */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 -translate-y-1/2 -left-48 w-[500px] h-[500px] rounded-full bg-lime/[0.05] blur-[150px]" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-48 w-[500px] h-[500px] rounded-full bg-turquoise/[0.05] blur-[150px]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {/* ─── Vision ─── */}
            <div>
              <h2 className="font-bebas-neue text-4xl sm:text-5xl tracking-widest text-white mb-6">
                {t('aboutVisionTitle')}
              </h2>

              <p className="text-white text-base sm:text-lg leading-relaxed font-light">
                {t('aboutVisionText')}
              </p>
            </div>

            {/* ─── Mission ─── */}
            <div className="md:border-l md:border-charcoal md:pl-12 lg:pl-16">
              <h2 className="font-bebas-neue text-4xl sm:text-5xl tracking-widest text-white mb-6">
                {t('aboutMissionTitle')}
              </h2>

              <p className="text-white text-base sm:text-lg leading-relaxed font-light">
                {t('aboutMissionText')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </SectionReveal>
  )
}
