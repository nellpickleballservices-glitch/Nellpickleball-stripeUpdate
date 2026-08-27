import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { GalleryGrid } from '@/components/public/GalleryGrid'
import type { GalleryItem } from '@/lib/types/admin'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')
  return {
    title: t('galleryMetaTitle'),
    description: t('galleryMetaDescription'),
    openGraph: {
      title: t('galleryMetaTitle'),
      description: t('galleryMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      images: [{ url: '/images/siteImages/players_in_action.jpeg', width: 1200, height: 630, alt: 'NELL Pickleball Club' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('galleryMetaTitle'),
      description: t('galleryMetaDescription'),
      images: ['/images/siteImages/players_in_action.jpeg'],
    },
    alternates: {
      canonical: `/${locale}/gallery`,
      languages: {
        en: '/en/gallery',
        es: '/es/gallery',
      },
    },
  }
}

export default async function GalleryPage() {
  const locale = await getLocale()
  const t = await getTranslations('Gallery')

  // Use the anon-key (RLS-respecting) client so a future bug here can't leak
  // hidden gallery items. The `is_visible = true` predicate is enforced both
  // by this query AND by the corresponding row-level security policy.
  const supabase = await createClient()
  const { data } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const items = (data ?? []) as GalleryItem[]

  return (
    <main
      className="min-h-screen bg-midnight relative"
    >

      {/* Hero — sticky so gallery scrolls over it */}
      <div className="sticky top-0 z-0">
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="inline-block px-10 py-8 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
              <h1 className="font-bungee text-4xl md:text-6xl text-lime tracking-widest">
                {t('pageTitle')}
              </h1>
              <p className="mt-4 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                {t('subtitle')}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* SVG distortion filter — referenced by the .glass-filter layer below.
          feTurbulence generates organic noise; feDisplacementMap warps the
          source pixels by that noise. baseFrequency low + scale moderate =
          subtle liquid-glass ripple instead of a chaotic distortion. */}
      {/* Gallery grid — frosted-glass window. A faint white tint plus a heavy
          backdrop-blur lets the wallpaper show through but stays legible, and
          the soft top border reads as the edge of a translucent panel. */}
      <section className="relative z-10 rounded-t-3xl min-h-screen w-full px-4 md:px-6 pt-12 md:pt-16 pb-32 -mt-4 bg-white/[0.04] backdrop-blur-md backdrop-saturate-150 border-t border-white/[0.10] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          {items.length === 0 ? (
            <p className="text-white/70 text-center py-20 text-lg">{t('noItems')}</p>
          ) : (
            <GalleryGrid items={items} locale={locale} />
          )}
        </ScrollReveal>
        </div>
      </section>
    </main>
  )
}
