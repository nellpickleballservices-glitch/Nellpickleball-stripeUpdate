'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { updatePasswordAction, AuthActionResult } from '@/app/actions/auth'

const initialState: AuthActionResult = {}

export default function UpdatePasswordForm() {
  const t = useTranslations('Auth.updatePassword')
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-offwhite text-sm font-medium">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.password && (
          <p className="text-red-300 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-offwhite text-sm font-medium">
          {t('confirmPassword')}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {state.errors?.confirmPassword && (
          <p className="text-red-300 text-sm mt-1">{state.errors.confirmPassword}</p>
        )}
      </div>

      {state.message && (
        <p className="text-red-300 text-sm text-center">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('updatingButton') : t('submitButton')}
      </button>
    </form>
  )
}
