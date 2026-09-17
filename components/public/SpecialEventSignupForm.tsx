'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createSpecialEventSignupAction } from '@/app/actions/special-event-signup'
import { formatPrice } from '@/lib/sessions'
import type { EventCurrency } from '@/lib/types/special-events'

type PaymentMethod = 'stripe' | 'cash'

interface Props {
  eventId: string
  priceCents: number
  effectivePriceCents: number
  currency: EventCurrency
  allowStripe: boolean
  allowCash: boolean
  isFull: boolean
  stripeAvailable: boolean
  /** Logged-in user info — null means not authenticated */
  user: { name: string; email: string } | null
}

export function SpecialEventSignupForm({
  eventId,
  priceCents,
  effectivePriceCents,
  currency,
  allowStripe,
  allowCash,
  isFull,
  stripeAvailable,
  user,
}: Props) {
  const t = useTranslations('SpecialEvents')
  const locale = useLocale()

  const isFree = effectivePriceCents === 0
  const showStripe = allowStripe && stripeAvailable && !isFree
  const showCash = allowCash || isFree

  const [method, setMethod] = useState<PaymentMethod>(
    showStripe ? 'stripe' : 'cash'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await createSpecialEventSignupAction({
      event_id: eventId,
      payment_method: isFree ? 'cash' : method,
    })

    if (!res.success) {
      setError(t(`error_${res.error}`))
      setSubmitting(false)
      return
    }

    if (res.kind === 'stripe') {
      window.location.href = res.checkoutUrl
      return
    }

    setDone(true)
    setSubmitting(false)
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-sm p-6 sm:p-8 text-center shadow-sm">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('signUpTitle')}
        </h3>
        <p className="text-slate text-sm mb-4">{t('loginRequired')}</p>
        <a
          href="/login"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-midnight text-white text-sm font-semibold hover:bg-midnight/90 transition-colors"
        >
          {t('loginButton')}
        </a>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-lime/40 bg-lime/10 p-6 sm:p-8 text-center">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('successTitle')}
        </h3>
        <p className="text-slate text-base">
          {isFree ? t('successBodyFree') : t('successBodyCash')}
        </p>
        <p className="text-slate/70 text-sm mt-3">{t('successCheckEmail')}</p>
      </div>
    )
  }

  if (isFull) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('soldOut')}
        </h3>
        <p className="text-slate text-base">{t('soldOutBody')}</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-sm p-6 sm:p-8 space-y-5 shadow-sm"
    >
      <div>
        <h3 className="font-bebas-neue text-2xl sm:text-3xl tracking-wide text-midnight">
          {t('signUpTitle')}
        </h3>
        <p className="text-slate text-sm mt-1">
          {isFree ? t('free') : formatPrice(effectivePriceCents, currency, locale)}
          {' · '}
          {t('perPerson')}
        </p>
      </div>

      {/* Logged-in user info */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-midnight font-medium">{user.name}</p>
        <p className="text-xs text-slate">{user.email}</p>
      </div>

      {/* Payment method — hidden when only one path */}
      {!isFree && showStripe && showCash && (
        <fieldset className="space-y-2">
          <legend className="block text-sm font-medium text-midnight mb-1">{t('paymentLabel')}</legend>
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            method === 'stripe' ? 'border-[#0ea5e9] bg-[#38BDF8]/5' : 'border-gray-300 hover:bg-gray-50'
          }`}>
            <input type="radio" name="payment_method" value="stripe" checked={method === 'stripe'}
              onChange={() => setMethod('stripe')} disabled={submitting} className="mt-1" />
            <span>
              <span className="block text-sm font-medium text-midnight">{t('payOnline')}</span>
              <span className="block text-xs text-slate/70">{t('payOnlineHelp')}</span>
            </span>
          </label>
          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            method === 'cash' ? 'border-[#0ea5e9] bg-[#38BDF8]/5' : 'border-gray-300 hover:bg-gray-50'
          }`}>
            <input type="radio" name="payment_method" value="cash" checked={method === 'cash'}
              onChange={() => setMethod('cash')} disabled={submitting} className="mt-1" />
            <span>
              <span className="block text-sm font-medium text-midnight">{t('payCash')}</span>
              <span className="block text-xs text-slate/70">{t('payCashHelp')}</span>
            </span>
          </label>
        </fieldset>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-slate/70">{t('privacyNote')}</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-midnight text-white text-sm font-semibold hover:bg-midnight/90 disabled:opacity-50 transition-colors"
        >
          {submitting
            ? t('submitting')
            : !isFree && method === 'stripe'
              ? t('continueToPayment')
              : t('reserveSpot')}
        </button>
      </div>
    </form>
  )
}
