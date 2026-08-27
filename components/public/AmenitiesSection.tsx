'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ScrollReveal } from '@/components/motion/ScrollReveal'

/**
 * Compact 2-column amenities strip. Designed to be embedded inside another
 * section (it now leads the "Open Play Sessions" section), so it has no outer
 * section wrapper, background, or own title — the parent provides the context.
 */
export function AmenitiesSection() {
  const t = useTranslations('Public')

  const amenities = [
    {
      key: 'water',
      image: '/images/siteImages/waterandtowel.png',
      title: t('amenityWaterTitle'),
      description: t('amenityWaterDesc'),
      // Shift the focal point above center so the bottle's top isn't cropped.
      objectPosition: 'object-[center_25%]',
    },
    {
      key: 'paddles',
      image: '/images/siteImages/pickleball_paddle.jpg',
      title: t('amenityPaddlesTitle'),
      description: t('amenityPaddlesDesc'),
      objectPosition: 'object-center',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto">
      {amenities.map((item, i) => (
        <ScrollReveal key={item.key} delay={i * 0.1}>
          <div className="h-full bg-charcoal border border-charcoal rounded-xl overflow-hidden">
            {/* Image — fluid width with a locked 4:3 aspect ratio. Scales down
                naturally on mobile so both cards still fit side-by-side without
                overflowing their card. Capped at 192px on larger viewports. */}
            <div className="relative w-full max-w-[192px] aspect-[4/3] mx-auto mt-2 sm:mt-4 rounded-lg overflow-hidden bg-midnight">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 45vw, 192px"
                className={`object-cover ${item.objectPosition}`}
              />
            </div>

            {/* Body */}
            <div className="px-2 sm:px-4 pt-2 sm:pt-3 pb-3 sm:pb-4 text-center">
              <h3 className="font-bungee text-xs sm:text-base text-offwhite tracking-wide mb-1">
                {item.title}
              </h3>
              <p className="text-white/70 text-[10px] sm:text-xs leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  )
}
