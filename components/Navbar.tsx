import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileNav } from '@/components/public/MobileNav'
import { NavLink } from '@/components/public/NavLink'
import { NavbarShell } from '@/components/public/NavbarShell'
import { logoutAction } from '@/app/actions/auth'
import { ScrollProgress } from '@/components/public/ScrollProgress'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const tBilling = await getTranslations('Billing')
  const tAdmin = await getTranslations('Admin')
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null
  let isAdmin = false

  const devBypass =
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_BYPASS_AUTH === 'true'

  if (devBypass) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user = { id: 'dev-bypass' } as any
    isAdmin = true
  } else {
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      user = data.user
      isAdmin = user?.app_metadata?.role === 'admin'
    } catch {
      // Network error reaching Supabase — render as logged-out
    }
  }

  return (
    <NavbarShell>
      {/* Brand — scales down when navbar is compact */}
      <Link href="/" className="flex items-center">
        <Image
          src="/images/icons/NellLogo.png"
          alt="NELL"
          width={200}
          height={100}
          priority
          className="origin-left transition-[height,width] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] h-[100px] w-[200px] scale-125 [[data-scrolled]_&]:h-[60px] [[data-scrolled]_&]:w-[120px] [[data-scrolled]_&]:scale-100"
        />
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
        {/* Public page links */}
        <NavLink href="/#sessions">{t('sessions')}</NavLink>
        <NavLink href="/learn-pickleball">{t('learn')}</NavLink>
        <NavLink href="/gallery">{t('gallery')}</NavLink>
        <NavLink href="/contact">{t('contact')}</NavLink>
        {user ? (
          <>
            {isAdmin && (
              <NavLink href="/n3ll-admin-x9k2">{tAdmin('adminNav')}</NavLink>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-bungee text-sm text-[var(--color-nav-link)] hover:text-[var(--color-nav-link-hover)] transition-colors"
              >
                {t('logout')}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="font-bungee text-sm text-[var(--color-nav-link)] hover:text-[var(--color-nav-link-hover)] transition-colors"
            >
              {t('login')}
            </Link>
            <Link
              href="/signup"
              className="font-bungee text-sm bg-[var(--color-nav-link)] text-white px-4 py-1.5 rounded-full hover:bg-[var(--color-nav-link-hover)] transition-colors"
            >
              {t('signup')}
            </Link>
          </>
        )}
        <LanguageSwitcher />
      </div>

      {/* Mobile nav */}
      <MobileNav user={user} isAdmin={isAdmin} />

      {/* Scroll progress bar — bottom edge of navbar */}
      <ScrollProgress />
    </NavbarShell>
  )
}
