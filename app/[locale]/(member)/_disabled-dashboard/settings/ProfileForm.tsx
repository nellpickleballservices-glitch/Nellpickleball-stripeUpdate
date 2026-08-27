'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { updateProfileAction, type ProfileActionResult } from '@/app/actions/profile'

interface ProfileFormProps {
  initialFirstName: string
  initialLastName: string
  initialPhone: string
}

export default function ProfileForm({
  initialFirstName,
  initialLastName,
  initialPhone,
}: ProfileFormProps) {
  const t = useTranslations('Settings')
  const [state, formAction, isPending] = useActionState<ProfileActionResult, FormData>(
    updateProfileAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-white mb-1">
          {t('firstName')}
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          defaultValue={initialFirstName}
          required
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      <div>
        <label htmlFor="lastName" className="block text-sm font-medium text-white mb-1">
          {t('lastName')}
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          defaultValue={initialLastName}
          required
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-white mb-1">
          {t('phone')}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialPhone}
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      {state.success && (
        <p className="text-sm text-green-400">{t('profileUpdated')}</p>
      )}

      {state.error === 'validation_error' && state.details && (
        <div className="text-sm text-red-300">
          {state.details.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
        </div>
      )}

      {state.error && state.error !== 'validation_error' && (
        <p className="text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#BFFF00] px-4 py-2.5 font-semibold text-[#1C305D] hover:bg-[#a8e600] transition-colors disabled:opacity-50"
      >
        {isPending ? t('saving') : t('saveProfile')}
      </button>
    </form>
  )
}
