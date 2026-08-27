'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createSessionSignupAction } from '@/app/actions/sessions'
import { formatSessionDate, formatPrice } from '@/lib/sessions'
import type { PaymentMethod, PlaySession, SessionOccurrence } from '@/lib/types/sessions'

interface Props {
  session: PlaySession
  occurrences: SessionOccurrence[]
  /** Date pre-selected from the card the visitor clicked. */
  initialDate?: string
  stripeAvailable: boolean
}

export function SessionSignupForm({ session, occurrences, initialDate, stripeAvailable }: Props) {
  const t = useTranslations('Sessions')
  const locale = useLocale()

  const selectable = occurrences.filter((o) => !o.isFull)
  const defaultDate =
    initialDate && selectable.some((o) => o.date === initialDate)
      ? initialDate
      : selectable[0]?.date ?? ''

  const [date, setDate] = useState(defaultDate)
  const [method, setMethod] = useState<PaymentMethod>(
    session.allow_stripe && stripeAvailable ? 'stripe' : 'cash'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isFree = session.price_cents === 0
  const showStripe = session.allow_stripe && stripeAvailable && !isFree
  const showCash = session.allow_cash || isFree
  const selected = occurrences.find((o) => o.date === date)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const res = await createSessionSignupAction({
      session_id: session.id,
      session_date: date,
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: (fd.get('phone') as string) || undefined,
      // A free session never goes through Stripe, whatever the radio says.
      payment_method: isFree ? 'cash' : method,
      hp: (fd.get('hp') as string) || undefined,
    })

    if (!res.success) {
      setError(t(`error_${res.error}`))
      setSubmitting(false)
      return
    }

    if (res.kind === 'stripe') {
      // Hand off to Stripe. Deliberately not resetting `submitting` — the page
      // is navigating away, and re-enabling the button invites a double charge.
      window.location.href = res.checkoutUrl
      return
    }

    setDone(true)
    setSubmitting(false)
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

  if (selectable.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('allFullTitle')}
        </h3>
        <p className="text-slate text-base">{t('allFullBody')}</p>
      </div>
    )
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50'

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
          {isFree ? t('free') : formatPrice(session.price_cents, session.currency, locale)}
          {' · '}
          {t('perPlayer')}
        </p>
      </div>

      {/* Honeypot — hidden from real users, harvested by bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Date — sold-out dates stay visible but unselectable so people can see
          the session runs on that day and simply came too late. */}
      <label className="block">
        <span className="block text-sm font-medium text-midnight mb-1">
          {t('chooseDate')} <span className="text-red-500">*</span>
        </span>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={submitting}
          className={inputCls}
          required
        >
          {occurrences.map((o) => (
            <option key={o.date} value={o.date} disabled={o.isFull}>
              {formatSessionDate(o.date, locale)}
              {o.isFull ? ` — ${t('soldOut')}` : ` — ${t('spotsLeft', { count: o.spotsLeft })}`}
            </option>
          ))}
        </select>
      </label>

      {selected && !selected.isFull && selected.spotsLeft <= 3 && (
        <p className="text-sm text-orange-700 font-medium">
          {t('almostFull', { count: selected.spotsLeft })}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('nameLabel')} <span className="text-red-500">*</span>
          </span>
          <input name="name" type="text" required maxLength={120} disabled={submitting} className={inputCls} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('emailLabel')} <span className="text-red-500">*</span>
          </span>
          <input name="email" type="email" required maxLength={200} disabled={submitting} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-midnight mb-1">{t('phoneLabel')}</span>
        <input name="phone" type="tel" maxLength={40} disabled={submitting} className={inputCls} />
      </label>

      {/* Payment method — hidden entirely when only one path is possible. */}
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
          disabled={submitting || !date}
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
