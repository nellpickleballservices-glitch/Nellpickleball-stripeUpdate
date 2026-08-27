import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import SignupForm from './SignupForm'
import { LogoOrb } from '@/components/effects/LogoOrb'

async function SignupPage() {
  const t = await getTranslations('Auth.signup')
  const tBrand = await getTranslations('Brand')

  return (
    <main className="min-h-screen bg-midnight flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-3xl">
        {/* NELL Logo */}
        <div className="relative text-center mb-8">
          <LogoOrb />
          <Image src="/images/icons/NellLogo.png" alt="NELL" width={200} height={100} className="relative z-10 h-[100px] w-[200px] mx-auto" />
        </div>

        <div className="bg-[#1C305D] border border-[#38BDF8] rounded-2xl shadow-xl p-8">
          <h2 className="text-offwhite font-bold text-2xl mb-6 text-center">
            {t('title')}
          </h2>
          <SignupForm />
        </div>
      </div>
    </main>
  )
}

export default SignupPage
