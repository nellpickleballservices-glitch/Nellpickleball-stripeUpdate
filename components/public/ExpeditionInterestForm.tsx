'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createExpeditionInterestAction } from '@/app/actions/expedition-interests'

interface Props {
  expeditionId: string
  /** Logged-in user info — null means not authenticated */
  user: { name: string; email: string } | null
}

export function ExpeditionInterestForm({ expeditionId, user }: Props) {
  const t = useTranslations('ExpeditionInterest')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const partyRaw = fd.get('party_size')
    const party = typeof partyRaw === 'string' && partyRaw.trim() !== ''
      ? parseInt(partyRaw, 10)
      : undefined

    const res = await createExpeditionInterestAction({
      expedition_id: expeditionId,
      name: user.name,
      email: user.email,
      party_size: party,
      message: (fd.get('message') as string) || undefined,
    })

    setSubmitting(false)
    if (res.success) {
      setDone(true)
    } else {
      setError(res.error)
    }
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-sm p-6 sm:p-8 text-center shadow-sm">
        <h3 className="font-bebas-neue text-2xl tracking-wide text-midnight mb-2">
          {t('title')}
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

      {/* Logged-in user info */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-midnight font-medium">{user.name}</p>
        <p className="text-xs text-slate">{user.email}</p>
      </div>

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
