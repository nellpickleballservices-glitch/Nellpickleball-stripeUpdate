'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createContactMessageAction } from '@/app/actions/contact'

const fieldClasses =
  'w-full px-4 py-3 rounded-xl border border-white/10 bg-midnight/60 text-offwhite text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-turquoise/50 focus:border-turquoise/40 disabled:opacity-50 transition-colors'

export function ContactForm() {
  const t = useTranslations('Contact')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const res = await createContactMessageAction({
      first_name: String(fd.get('first_name') ?? ''),
      last_name: String(fd.get('last_name') ?? ''),
      email: String(fd.get('email') ?? ''),
      question: String(fd.get('question') ?? ''),
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
      <div className="rounded-2xl border border-lime/40 bg-lime/10 p-8 text-center">
        <h3 className="font-bebas-neue text-2xl sm:text-3xl tracking-wide text-offwhite mb-2">
          {t('formSuccessTitle')}
        </h3>
        <p className="text-white text-sm sm:text-base">{t('formSuccessBody')}</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-charcoal p-6 sm:p-8 space-y-5"
    >
      <h2 className="font-bebas-neue text-2xl sm:text-3xl text-offwhite tracking-widest">
        {t('formTitle')}
      </h2>

      {/* Honeypot — visually hidden from real users, harvested by bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-offwhite mb-1.5">
            {t('firstNameLabel')} <span className="text-turquoise">*</span>
          </span>
          <input
            name="first_name"
            type="text"
            required
            maxLength={80}
            autoComplete="given-name"
            disabled={submitting}
            className={fieldClasses}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-offwhite mb-1.5">
            {t('lastNameLabel')} <span className="text-turquoise">*</span>
          </span>
          <input
            name="last_name"
            type="text"
            required
            maxLength={80}
            autoComplete="family-name"
            disabled={submitting}
            className={fieldClasses}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-offwhite mb-1.5">
          {t('emailLabel')} <span className="text-turquoise">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          disabled={submitting}
          className={fieldClasses}
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-offwhite mb-1.5">
          {t('questionLabel')} <span className="text-turquoise">*</span>
        </span>
        <textarea
          name="question"
          rows={5}
          required
          maxLength={2000}
          placeholder={t('questionPlaceholder')}
          disabled={submitting}
          className={`${fieldClasses} resize-y`}
        />
      </label>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-turquoise text-midnight text-base font-bold tracking-wide hover:bg-lime hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200 shadow-lg shadow-turquoise/20"
      >
        {submitting ? t('formSubmitting') : t('formSubmit')}
      </button>
    </form>
  )
}
