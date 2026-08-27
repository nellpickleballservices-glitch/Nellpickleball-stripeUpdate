'use client'

import { useState, useRef, useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { signUpAction, AuthActionResult } from '@/app/actions/auth'
import { validateName } from '@/lib/utils/normalizeName'
import { CountrySelect } from '@/components/CountrySelect'
import { createClient } from '@/lib/supabase/client'

const initialState: AuthActionResult = {}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function SignupForm() {
  const t = useTranslations('Auth.signup')
  const locale = useLocale()
  const [state, formAction, isPending] = useActionState(signUpAction, initialState)

  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState<string | null>(null)

  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  function handleNameBlur(
    field: 'firstName' | 'lastName',
    value: string,
    setError: (err: string | null) => void,
  ) {
    setError(validateName(value))
  }

  function handleSubmit(formData: FormData) {
    setPasswordMismatch(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setPasswordMismatch(
        locale === 'en' ? 'Passwords do not match' : 'Las contrasenas no coinciden',
      )
      // Clear only password fields, keep everything else
      if (passwordRef.current) passwordRef.current.value = ''
      if (confirmRef.current) confirmRef.current.value = ''
      confirmRef.current?.focus()
      return
    }

    formAction(formData)
  }

  // Server-side field errors override client-side on submit
  const firstErr = state.errors?.firstName ?? firstNameError
  const lastErr = state.errors?.lastName ?? lastNameError

  async function handleGoogleSignUp() {
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Google OAuth button */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        className="flex items-center justify-center gap-3 w-full border border-[#38BDF8] text-offwhite font-semibold rounded-full py-3 px-6 hover:bg-[#38BDF8]/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {t('googleButton')}
      </button>

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-offwhite/20" />
        <span className="text-white/70 text-sm">{t('or')}</span>
        <hr className="flex-1 border-offwhite/20" />
      </div>

    <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* First Name */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="firstName" className="text-offwhite text-sm font-medium">
          {t('firstName')}
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          defaultValue={state.fields?.firstName ?? ''}
          onBlur={(e) => handleNameBlur('firstName', e.target.value, setFirstNameError)}
          className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {firstErr && <p className="text-red-300 text-sm mt-1">{firstErr}</p>}
      </div>

      {/* Last Name */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="lastName" className="text-offwhite text-sm font-medium">
          {t('lastName')}
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          defaultValue={state.fields?.lastName ?? ''}
          onBlur={(e) => handleNameBlur('lastName', e.target.value, setLastNameError)}
          className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
        {lastErr && <p className="text-red-300 text-sm mt-1">{lastErr}</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="email" className="text-offwhite text-sm font-medium">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.fields?.email ?? ''}
          className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {/* Phone (optional) */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="phone" className="text-offwhite text-sm font-medium">
          {t('phone')}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={state.fields?.phone ?? ''}
          className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 outline-none transition-colors"
        />
      </div>

      {/* Country */}
      <div className="lg:col-span-2 min-w-0">
        <CountrySelect
          name="country"
          label={t('country')}
          locale={locale as 'en' | 'es'}
          defaultValue={state.fields?.country ?? 'DO'}
        />
        {state.errors?.country && (
          <p className="text-red-300 text-sm mt-1">{state.errors.country}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="password" className="text-offwhite text-sm font-medium">
          {t('password')}
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 pr-11 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-offwhite transition-colors"
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        {state.errors?.password && (
          <p className="text-red-300 text-sm mt-1">{state.errors.password}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="flex flex-col gap-1 min-w-0">
        <label htmlFor="confirmPassword" className="text-offwhite text-sm font-medium">
          {t('confirmPassword')}
        </label>
        <div className="relative">
          <input
            ref={confirmRef}
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            className="w-full bg-charcoal text-offwhite border border-white/20 focus:border-turquoise rounded-lg px-4 py-2.5 pr-11 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-offwhite transition-colors"
            tabIndex={-1}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {(passwordMismatch || state.errors?.confirmPassword) && (
          <p className="text-red-300 text-sm mt-1">
            {passwordMismatch ?? state.errors?.confirmPassword}
          </p>
        )}
      </div>

      {/* Global error message */}
      {state.message && (
        <p className="lg:col-span-2 text-red-300 text-sm text-center">{state.message}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="lg:col-span-2 bg-lime text-midnight font-bold rounded-full py-3 px-6 hover:scale-105 hover:bg-sunset transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? t('submittingButton') : t('submitButton')}
      </button>

      <p className="lg:col-span-2 text-white/90 text-sm text-center">
        {t('alreadyHaveAccount')}{' '}
        <a href="/login" className="text-turquoise hover:underline">
          {t('loginLink')}
        </a>
      </p>
    </form>
    </div>
  )
}
