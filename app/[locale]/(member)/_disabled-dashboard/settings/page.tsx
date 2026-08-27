import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import ProfileForm from './ProfileForm'
import PasswordForm from './PasswordForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const t = await getTranslations('Settings')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-[#1C305D] py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-white/90">
          <Link href="/dashboard" className="hover:text-[#BFFF00] transition-colors">
            {t('breadcrumbDashboard')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">{t('breadcrumbSettings')}</span>
        </nav>

        <h1 className="text-2xl font-bold text-white mb-8">{t('pageTitle')}</h1>

        {/* Personal Information Section */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">{t('personalInfoTitle')}</h2>
          <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700/50">
            <ProfileForm
              initialFirstName={profile?.first_name ?? ''}
              initialLastName={profile?.last_name ?? ''}
              initialPhone={profile?.phone ?? ''}
            />
          </div>
        </section>

        {/* Change Password Section */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">{t('changePasswordTitle')}</h2>
          <div className="bg-[#1E293B] rounded-xl p-6 border border-gray-700/50">
            <PasswordForm />
          </div>
        </section>
      </div>
    </main>
  )
}
