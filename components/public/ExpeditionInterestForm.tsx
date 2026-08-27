'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createExpeditionInterestAction } from '@/app/actions/expedition-interests'

interface Props {
  expeditionId: string
}

export function ExpeditionInterestForm({ expeditionId }: Props) {
  const t = useTranslations('ExpeditionInterest')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const partyRaw = fd.get('party_size')
    const party = typeof partyRaw === 'string' && partyRaw.trim() !== ''
      ? parseInt(partyRaw, 10)
      : undefined

    const res = await createExpeditionInterestAction({
      expedition_id: expeditionId,
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: (fd.get('phone') as string) || undefined,
      party_size: party,
      message: (fd.get('message') as string) || undefined,
      hp: (fd.get('hp') as string) || undefined,
    })

    setSubmitting(false)
    if (res.success) {
      setDone(true)
    } else {
      setError(res.error)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-lime/40 bg-lime/10 p-6 sm:p-8 text-center">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('successTitle')}
        </h3>
        <p className="text-slate text-base">{t('successBody')}</p>
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
          {t('title')}
        </h3>
        <p className="text-slate text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Honeypot — visually hidden from real users, harvested by bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('nameLabel')} <span className="text-red-500">*</span>
          </span>
          <input
            name="name"
            type="text"
            required
            maxLength={120}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('emailLabel')} <span className="text-red-500">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('phoneLabel')}
          </span>
          <input
            name="phone"
            type="tel"
            maxLength={40}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-midnight mb-1">
            {t('partySizeLabel')}
          </span>
          <input
            name="party_size"
            type="number"
            min={1}
            max={200}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-midnight mb-1">
          {t('messageLabel')}
        </span>
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          disabled={submitting}
          placeholder={t('messagePlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise/50 disabled:opacity-50"
        />
      </label>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-slate/70">{t('privacyNote')}</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-midnight text-white text-sm font-semibold hover:bg-midnight/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </form>
  )
}
