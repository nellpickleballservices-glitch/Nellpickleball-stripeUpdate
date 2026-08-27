'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { resetPasswordAction, AuthActionResult } from '@/app/actions/auth'

const initialState: AuthActionResult = {}

export default function ResetPasswordForm() {
  const t = useTranslations('Auth.resetPassword')
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  if (state.message && !state.errors) {
    // Success state — email sent
    return (
      <div className="text-center">
        <p className="text-lime font-semibold text-lg mb-2">
          {t('checkInbox')}
        </p>
        <p className="text-white text-sm">
          {state.message}
        </p>
        <a
          href="/login"
          className="inline-block mt-6 text-turquoise hover:underline text-sm"
        >
          {t('backToLogin')}
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="text-white text-sm text-center">
        {t('description')}
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-offwhite text-sm font-medium">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {state.message && (
        <p className="text-red-300 text-sm text-center">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('sendingButton') : t('submitButton')}
      </button>

      <a href="/login" className="text-white/90 text-sm text-center hover:underline">
        {t('backToLogin')}
      </a>
    </form>
  )
}
