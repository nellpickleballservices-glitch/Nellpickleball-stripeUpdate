'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

type Lang = 'en' | 'es'

const LANG_META: Record<Lang, { label: string; color: string; flag: string }> = {
  // Track colors match each flag's dominant tone — UK navy for English,
  // Spain red for Spanish — so the track itself recolors when the toggle flips.
  // `flag` points to the SVG asset in /public/images/flags/.
  en: { label: 'English', color: '#012169', flag: '/images/flags/gb.svg' },
  es: { label: 'Español', color: '#AA151B', flag: '/images/flags/es.svg' },
}

export function LanguageSwitcher() {
  const locale = useLocale() as Lang
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('Nav')

  const targetLocale: Lang = locale === 'en' ? 'es' : 'en'

  const handleToggle = () => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .update({ locale_pref: targetLocale })
          .eq('id', user.id)
      }
    })
    router.replace(pathname, { locale: targetLocale })
  }

  const { color, label, flag } = LANG_META[locale]
  const isEs = locale === 'es'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEs}
      aria-label={t('languageSwitcher')}
      title={label}
      onClick={handleToggle}
      className="relative inline-flex h-7 w-14 items-center rounded-full border border-black/25 shadow-[0_2px_4px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-colors duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-nav-link)]"
      style={{ backgroundColor: color }}
    >
      <span
        className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/25 shadow-[0_2px_3px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-transform duration-300 ease-out"
        style={{ transform: isEs ? 'translateX(28px)' : 'translateX(2px)' }}
      >
        <Image
          src={flag}
          alt={label}
          fill
          sizes="24px"
          className="object-cover"
        />
      </span>
    </button>
  )
}
