import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import { getContentBlock } from '@/lib/content'

export async function Footer() {
  const locale = await getLocale()
  const t = await getTranslations('Footer')

  // Fetch social links from CMS, with hardcoded fallbacks
  let socialLinks: { instagram?: string; facebook?: string; tiktok?: string } = {
    instagram: 'https://www.instagram.com/nellpickleballclub/',
    facebook: 'https://www.facebook.com/nell.pickleball.club',
    tiktok: 'https://www.tiktok.com/@nell.pickleball.c',
  }
  const raw = await getContentBlock('footer_social_links', locale)
  if (raw) {
    try {
      socialLinks = { ...socialLinks, ...JSON.parse(raw) }
    } catch {
      // fallback to defaults
    }
  }

  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''
  const whatsappGreeting =
    locale === 'en'
      ? 'Hello, I have a question about NELL Pickleball Club'
      : 'Hola, tengo una pregunta sobre NELL Pickleball Club'

  const navLinks = [
    { href: '/', label: t('home') },
    { href: '/#sessions', label: t('reservations') },
    { href: '/learn-pickleball', label: t('learn') },
    { href: '/gallery', label: t('gallery') },
    { href: '/contact', label: t('contact') },
  ]

  return (
    <footer className="bg-midnight border-t border-charcoal">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand column */}
          <div>
            <p className="font-bungee text-3xl text-lime tracking-widest">
              NELL
            </p>
            <p className="text-white text-sm mt-1">Pickleball Club</p>
            <a
              href="mailto:nellpickleballclub@gmail.com"
              className="text-turquoise text-sm mt-3 block hover:text-lime transition-colors"
            >
              nellpickleballclub@gmail.com
            </a>
            {whatsappPhone && (
              <a
                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappGreeting)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-400 mt-2 inline-flex items-center gap-1.5 hover:text-green-300 transition-colors"
              >
                {/* WhatsApp icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>

          {/* Quick Nav column */}
          <div>
            <h3 className="font-bebas-neue text-lg text-offwhite tracking-wider mb-4">
              {t('quickNav')}
            </h3>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white hover:text-lime transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social column */}
          <div>
            <h3 className="font-bebas-neue text-lg text-offwhite tracking-wider mb-4">
              {t('socialLabel')}
            </h3>
            <div className="flex items-center gap-4">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-turquoise hover:text-lime transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-turquoise hover:text-lime transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-turquoise hover:text-lime transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.8a4.84 4.84 0 01-1-.11z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-charcoal mt-10 pt-6 text-center">
          <p className="text-xs text-white/80">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          {/* Icon attribution required by Flaticon's free license. */}
          <p className="text-xs text-white/70 mt-2">
            <a
              href="https://www.flaticon.com/free-icons/social-responsibility"
              title="social-responsibility icons"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Social-responsibility icons created by Freepik - Flaticon
            </a>
            <span className="mx-2 opacity-50">·</span>
            <a
              href="https://www.flaticon.com/free-icons/accessibility"
              title="accessibility icons"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Accessibility icons created by icon_small - Flaticon
            </a>
            <span className="mx-2 opacity-50">·</span>
            <a
              href="https://www.flaticon.com/free-icons/tourist"
              title="tourist icons"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Tourist icons created by Freepik - Flaticon
            </a>
            <span className="mx-2 opacity-50">·</span>
            <a
              href="https://www.flaticon.com/free-icons/church"
              title="church icons"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Church icons created by Freepik - Flaticon
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
