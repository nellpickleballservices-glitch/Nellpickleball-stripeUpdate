'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { changePasswordAction, type ProfileActionResult } from '@/app/actions/profile'

export default function PasswordForm() {
  const t = useTranslations('Settings')
  const [state, formAction, isPending] = useActionState<ProfileActionResult, FormData>(
    changePasswordAction,
    {},
  )

  const errorMessage = state.error
    ? t.has(`errors.${state.error}`)
      ? t(`errors.${state.error}`)
      : state.error
    : null

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-white mb-1">
          {t('currentPassword')}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-white mb-1">
          {t('newPassword')}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1">
          {t('confirmNewPassword')}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-gray-600 bg-[#1C305D] px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#BFFF00] focus:outline-none focus:ring-1 focus:ring-[#BFFF00]"
        />
      </div>

      {state.success && (
        <p className="text-sm text-green-400">{t('passwordChanged')}</p>
      )}

      {errorMessage && (
        <p className="text-sm text-red-300">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#BFFF00] px-4 py-2.5 font-semibold text-[#1C305D] hover:bg-[#a8e600] transition-colors disabled:opacity-50"
      >
        {isPending ? t('changingPassword') : t('changePassword')}
      </button>
    </form>
  )
}
