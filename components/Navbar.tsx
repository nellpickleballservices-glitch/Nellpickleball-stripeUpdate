import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileNav } from '@/components/public/MobileNav'
import { NavLink } from '@/components/public/NavLink'
import { NavbarShell } from '@/components/public/NavbarShell'
import { logoutAction } from '@/app/actions/auth'
import { ScrollProgress } from '@/components/public/ScrollProgress'
import { UserProfileDropdown } from '@/components/public/UserProfileDropdown'

export interface UserProfile {
  firstName: string
  memberSince: string
  activeSessions: { title: string; date: string; startTime: string; endTime: string }[]
}

export async function Navbar() {
  const t = await getTranslations('Nav')
  const tBilling = await getTranslations('Billing')
  const tAdmin = await getTranslations('Admin')
  let user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] = null
  let isAdmin = false
  let profile: UserProfile | null = null

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

      if (user && !isAdmin) {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('first_name, created_at')
          .eq('id', user.id)
          .single()

        const today = new Date().toISOString().slice(0, 10)
        const { data: signups } = await supabaseAdmin
          .from('session_signups')
          .select('session_date, play_sessions(title_en, title_es, start_time, end_time)')
          .eq('email', user.email!.toLowerCase())
          .in('payment_status', ['pending', 'paid'])
          .gte('session_date', today)
          .order('session_date', { ascending: true })
          .limit(10)

        const activeSessions = (signups ?? []).map((s) => {
          const ps = s.play_sessions as unknown as
            | { title_en: string; title_es: string; start_time: string; end_time: string }
            | null
          return {
            title: ps?.title_en ?? ps?.title_es ?? 'Session',
            date: s.session_date,
            startTime: (ps?.start_time ?? '').slice(0, 5),
            endTime: (ps?.end_time ?? '').slice(0, 5),
          }
        })

        profile = {
          firstName: profileData?.first_name ?? user.user_metadata?.first_name ?? '',
          memberSince: profileData?.created_at ?? user.created_at ?? '',
          activeSessions,
        }
      }
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
            {profile && (
              <UserProfileDropdown profile={profile} logoutAction={logoutAction} t={{ logout: t('logout'), since: t('memberSince'), activeSessions: t('activeSessions'), noSessions: t('noActiveSessions') }} />
            )}
            {!profile && (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="font-bungee text-sm text-[var(--color-nav-link)] hover:text-[var(--color-nav-link-hover)] transition-colors"
                >
                  {t('logout')}
                </button>
              </form>
            )}
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
      <MobileNav user={user} isAdmin={isAdmin} profile={profile} />

      {/* Scroll progress bar — bottom edge of navbar */}
      <ScrollProgress />
    </NavbarShell>
  )
}
