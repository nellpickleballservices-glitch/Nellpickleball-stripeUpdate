import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const tDash = await getTranslations('Dashboard')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : ''

  return (
    <main className="min-h-screen bg-[#1C305D] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">
            {userName || 'Dashboard'}
          </h1>
          <Link
            href="/dashboard/settings"
            className="text-white/90 hover:text-white transition-colors text-sm"
          >
            {tDash('settings')}
          </Link>
        </div>

        {/* Profile info */}
        <div className="bg-[#1E293B] rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-lime/10 flex items-center justify-center">
              <svg className="h-7 w-7 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              {userName && <p className="text-white font-semibold text-lg">{userName}</p>}
              <p className="text-white/60 text-sm">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-[#1E293B] rounded-xl p-6 border border-lime/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-lime/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
          </div>
          <ul className="space-y-3 text-white/80 text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime/60 shrink-0" />
              Court reservations &amp; online booking
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime/60 shrink-0" />
              Membership perks &amp; exclusive access
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime/60 shrink-0" />
              Match history &amp; player stats
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime/60 shrink-0" />
              Professional training &amp; certified coaching
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime/60 shrink-0" />
              Tournaments &amp; social mixers
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
