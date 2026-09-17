'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { uploadSessionImageAction } from '@/app/actions/admin/sessions'
import { translateExpeditionContentAction } from '@/app/actions/admin'
import type { TranslatePayload } from '@/app/actions/admin/translate'
import { compressImage } from '@/lib/image-compress'
import { FIELD_FULL, FIELD_LABEL, BUTTON_PRIMARY, BUTTON_SOFT } from '@/lib/admin-styles'
import { parseBlocks, type Block } from '@/lib/types/expedition-blocks'
import { ExpeditionContent } from '@/components/public/ExpeditionContent'
import { defaultSessionBlocks } from '@/lib/session-template'
import { clubToday, generateOccurrences, formatSessionDate } from '@/lib/sessions'
import type { PlaySession, DayOfWeek } from '@/lib/types/sessions'

// Same treatment as ExpeditionForm: the builder bundle only loads once an
// admin actually opens the form.
const PageBuilder = dynamic(
  () => import('../expeditions/PageBuilder').then((mod) => ({ default: mod.PageBuilder })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-gray-500 italic text-center py-6 border border-dashed border-gray-300 rounded-lg bg-white">
        Loading editor…
      </p>
    ),
  }
)

function cloneBlocksWithNewIds(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    const cloned = JSON.parse(JSON.stringify(b)) as Block
    cloned.id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    return cloned
  })
}

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

/** Localized weekday names, derived rather than stored as 14 message keys. */
function weekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-DO', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  // 2024-01-07 was a Sunday, giving index 0 = Sunday to match getDay().
  return ALL_DAYS.map((d) => {
    const label = fmt.format(new Date(Date.UTC(2024, 0, 7 + d)))
    return label.charAt(0).toUpperCase() + label.slice(1)
  })
}

interface SessionFormProps {
  session?: PlaySession
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

export function SessionForm({ session, onSubmit, onCancel }: SessionFormProps) {
  const t = useTranslations('Admin')
  const locale = useLocale()
  const dayLabels = weekdayLabels(locale)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [titleEs, setTitleEs] = useState(session?.title_es ?? '')
  const [titleEn, setTitleEn] = useState(session?.title_en ?? '')
  const [descriptionEs, setDescriptionEs] = useState(session?.description_es ?? '')
  const [descriptionEn, setDescriptionEn] = useState(session?.description_en ?? '')

  // Recurring is the default for a new session — it's the common case — but a
  // one-time game only ever needs the single date below.
  const [isRecurring, setIsRecurring] = useState(session?.is_recurring ?? true)
  const [specificDate, setSpecificDate] = useState(session?.specific_date ?? '')
  const [days, setDays] = useState<DayOfWeek[]>(session?.days_of_week ?? [])
  const [startTime, setStartTime] = useState((session?.start_time ?? '18:00').slice(0, 5))
  const [endTime, setEndTime] = useState((session?.end_time ?? '20:00').slice(0, 5))
  const [capacity, setCapacity] = useState(session?.capacity ?? 10)
  const [weeksAhead, setWeeksAhead] = useState(session?.weeks_ahead ?? 8)
  const [blackouts, setBlackouts] = useState<string[]>(session?.blackout_dates ?? [])
  const [blackoutDraft, setBlackoutDraft] = useState('')

  const [images, setImages] = useState<string[]>(
    session?.image_urls?.length ? session.image_urls : session?.image_url ? [session.image_url] : []
  )
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [blocksEs, setBlocksEs] = useState<Block[]>(parseBlocks(session?.details_es))
  const [blocksEn, setBlocksEn] = useState<Block[]>(parseBlocks(session?.details_en))
  const [detailsTab, setDetailsTab] = useState<'es' | 'en'>('es')
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  function toggleDay(day: DayOfWeek) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  function addBlackout() {
    const d = blackoutDraft.trim()
    if (!d || blackouts.includes(d)) return
    setBlackouts((prev) => [...prev, d].sort())
    setBlackoutDraft('')
  }

  /** Seeds the active language tab with the editable default page. */
  function loadDefaultTemplate() {
    const blocks = defaultSessionBlocks(detailsTab)
    if (detailsTab === 'es') setBlocksEs(blocks)
    else setBlocksEn(blocks)
  }

  function copyFromOtherLanguage() {
    setTranslateError(null)
    if (detailsTab === 'es') {
      setTitleEs(titleEn)
      setDescriptionEs(descriptionEn)
      setBlocksEs(cloneBlocksWithNewIds(blocksEn))
    } else {
      setTitleEn(titleEs)
      setDescriptionEn(descriptionEs)
      setBlocksEn(cloneBlocksWithNewIds(blocksEs))
    }
  }

  async function translateFromOtherLanguage() {
    setTranslateError(null)
    setTranslating(true)
    try {
      const source: 'es' | 'en' = detailsTab === 'es' ? 'en' : 'es'
      const payload: TranslatePayload =
        source === 'es'
          ? { source, title: titleEs, description: descriptionEs, blocks: blocksEs }
          : { source, title: titleEn, description: descriptionEn, blocks: blocksEn }

      const result = await translateExpeditionContentAction(payload)
      const nextBlocks = cloneBlocksWithNewIds(result.blocks)

      if (detailsTab === 'es') {
        setTitleEs(result.title)
        setDescriptionEs(result.description)
        setBlocksEs(nextBlocks)
      } else {
        setTitleEn(result.title)
        setDescriptionEn(result.description)
        setBlocksEn(nextBlocks)
      }
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setUploadFeedback(null)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const optimized = await compressImage(file)
        const fd = new FormData()
        fd.append('file', optimized)
        const { url } = await uploadSessionImageAction(fd)
        uploaded.push(url)
      }
      setImages((prev) => [...prev, ...uploaded])
      setUploadFeedback('Uploaded!')
      setTimeout(() => setUploadFeedback(null), 3000)
    } catch {
      setUploadFeedback('Upload failed. Please try again.')
      setTimeout(() => setUploadFeedback(null), 4000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (isRecurring && days.length === 0) {
      setError(t('sessionErrorNoDays'))
      return
    }
    if (!isRecurring && !specificDate) {
      setError(t('sessionErrorNoDate'))
      return
    }
    if (endTime <= startTime) {
      setError(t('sessionErrorTimeOrder'))
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      // Values not carried by native form controls
      formData.set('is_recurring', String(isRecurring))
      formData.set('specific_date', isRecurring ? '' : specificDate)
      formData.set('days_of_week', JSON.stringify(isRecurring ? days : []))
      formData.set('blackout_dates', JSON.stringify(blackouts))
      formData.set('image_urls', JSON.stringify(images))
      formData.set('details_es', JSON.stringify(blocksEs))
      formData.set('details_en', JSON.stringify(blocksEn))
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Live preview of the dates this configuration will actually publish. A
  // one-time session has exactly one, so the cap only bites on recurring ones.
  const previewDates = generateOccurrences(
    {
      is_recurring: isRecurring,
      days_of_week: days,
      weeks_ahead: Math.min(weeksAhead, 4), // preview only the first few weeks
      specific_date: specificDate || null,
      blackout_dates: blackouts,
      capacity,
      start_time: startTime,
      end_time: endTime,
    },
    {}
  ).slice(0, 8)

  // The number the admin actually cares about: how many bookable cards this
  // configuration puts on the site. weeks_ahead multiplies by the day count,
  // which is exactly the part that isn't obvious from the two inputs alone.
  const totalCards = isRecurring ? days.length * weeksAhead : 1

  const inputCls = FIELD_FULL
  const labelCls = FIELD_LABEL

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">
        {session ? t('editSession') : t('addSession')}
      </h2>

      {/* ── SECTION 1: Card info ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('sessionCardInfo')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('sessionTitleEs')}</label>
            <input name="title_es" type="text" required value={titleEs}
              onChange={(e) => setTitleEs(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionTitleEn')}</label>
            <input name="title_en" type="text" required value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('sessionDescriptionEs')}</label>
            <textarea name="description_es" rows={3} value={descriptionEs}
              onChange={(e) => setDescriptionEs(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionDescriptionEn')}</label>
            <textarea name="description_en" rows={3} value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <label className={labelCls}>{t('sessionImages')}</label>
          <input type="hidden" name="image_urls" value={JSON.stringify(images)} />

          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload} className="hidden" />
            <button type="button" disabled={uploading}
              onClick={() => fileInputRef.current?.click()} className={BUTTON_SOFT}>
              {uploading ? t('uploading') : t('uploadFromDevice')}
            </button>
            {uploadFeedback && (
              <span className={`text-xs ${uploadFeedback === 'Uploaded!' ? 'text-green-700' : 'text-red-600'}`}>
                {uploadFeedback}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="text" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const url = urlDraft.trim()
                  if (url) { setImages((p) => [...p, url]); setUrlDraft('') }
                }
              }}
              placeholder="https://... then press Add" className={inputCls} />
            <button type="button"
              onClick={() => {
                const url = urlDraft.trim()
                if (url) { setImages((p) => [...p, url]); setUrlDraft('') }
              }}
              className="shrink-0 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              {t('add')}
            </button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative rounded-lg overflow-hidden border border-gray-300 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-28 object-cover" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                      {t('cover')}
                    </span>
                  )}
                  <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                    className="absolute bottom-1 right-1 grid place-items-center w-6 h-6 rounded bg-red-500/70 text-white text-sm hover:bg-red-500">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Schedule ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('sessionSchedule')}
        </p>

        {/* Repeats weekly, or runs once. Everything below keys off this. */}
        <div>
          <label className={labelCls}>{t('sessionRepeat')}</label>
          <div className="flex flex-wrap gap-2">
            {([true, false] as const).map((mode) => (
              <button key={String(mode)} type="button" onClick={() => setIsRecurring(mode)}
                aria-pressed={isRecurring === mode}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  isRecurring === mode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}>
                {mode ? t('sessionRepeatWeekly') : t('sessionRepeatOnce')}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {isRecurring ? t('sessionRepeatWeeklyHelp') : t('sessionRepeatOnceHelp')}
          </p>
        </div>

        {isRecurring ? (
          <div>
            <label className={labelCls}>{t('sessionDaysOfWeek')}</label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  aria-pressed={days.includes(day)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    days.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}>
                  {dayLabels[day]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{t('sessionDaysHelp')}</p>
          </div>
        ) : (
          <div className="md:max-w-xs">
            <label className={labelCls}>{t('sessionSpecificDate')}</label>
            <input type="date" required value={specificDate} min={clubToday()}
              onChange={(e) => setSpecificDate(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('sessionSpecificDateHelp')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('sessionStartTime')}</label>
            <input name="start_time" type="time" required value={startTime}
              onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionEndTime')}</label>
            <input name="end_time" type="time" required value={endTime}
              onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('sessionEndTimeHelp')}</p>
          </div>
          {/* Only a recurring series has a horizon to project. */}
          {isRecurring && (
            <div>
              <label className={labelCls}>{t('sessionWeeksAhead')}</label>
              <input name="weeks_ahead" type="number" min={1} max={52} value={weeksAhead}
                onChange={(e) => setWeeksAhead(Number(e.target.value))} className={inputCls} />
              <p className="text-xs text-gray-500 mt-1">{t('sessionWeeksAheadHelp')}</p>
            </div>
          )}
        </div>

        {/* Blackout dates */}
        <div>
          <label className={labelCls}>{t('sessionBlackoutDates')}</label>
          <div className="flex items-center gap-2">
            <input type="date" value={blackoutDraft} min={clubToday()}
              onChange={(e) => setBlackoutDraft(e.target.value)} className={inputCls} />
            <button type="button" onClick={addBlackout}
              className="shrink-0 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              {t('add')}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t('sessionBlackoutHelp')}</p>
          {blackouts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {blackouts.map((d) => (
                <span key={d} className="inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                  {d}
                  <button type="button" onClick={() => setBlackouts((p) => p.filter((x) => x !== d))}
                    aria-label={`Remove ${d}`} className="text-red-600 hover:text-red-700">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preview of the dates this config publishes */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              {t('sessionUpcomingPreview')}
            </p>
            {/* Spells out the multiplication before it surprises anyone on the
                live site: N weeks x M weekdays is N*M separate bookable cards. */}
            <p className="text-xs font-semibold text-blue-700">
              {t('sessionCardCount', { count: totalCards })}
            </p>
          </div>
          {previewDates.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t('sessionNoUpcoming')}</p>
          ) : (
            <ul className="text-sm text-gray-700 space-y-1">
              {previewDates.map((o) => (
                <li key={o.date}>• {formatSessionDate(o.date, locale)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Capacity + payment ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('sessionCapacityPayment')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('sessionCapacity')}</label>
            <input name="capacity" type="number" min={1} max={100} required value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('sessionCapacityHelp')}</p>
          </div>
          <div>
            <label className={labelCls}>{t('sessionPrice')}</label>
            <input name="price" type="number" min={0} step="0.01"
              defaultValue={((session?.price_cents ?? 0) / 100).toFixed(2)} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('sessionPriceHelp')}</p>
          </div>
          <div>
            <label className={labelCls}>{t('sessionCurrency')}</label>
            <select name="currency" defaultValue={session?.currency ?? 'usd'} className={inputCls}>
              <option value="usd">USD</option>
              <option value="dop">DOP</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="allow_stripe" type="checkbox" defaultChecked={session?.allow_stripe ?? true}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
            {t('sessionAllowStripe')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="allow_cash" type="checkbox" defaultChecked={session?.allow_cash ?? true}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
            {t('sessionAllowCash')}
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('sessionLocation')}</label>
            <input name="location_name" type="text" defaultValue={session?.location_name ?? ''}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionSortOrder')}</label>
            <input name="sort_order" type="number" min={0} defaultValue={session?.sort_order ?? 0}
              className={inputCls} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input name="is_published" type="checkbox" defaultChecked={session?.is_published ?? false}
                className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
              {t('sessionPublished')}
            </label>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Page content ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('sessionPageContent')}
        </p>
        <p className="text-xs text-gray-500 -mt-2">{t('sessionPageContentHelp')}</p>

        <div className="flex gap-4 border-b border-gray-300">
          {(['es', 'en'] as const).map((lang) => (
            <button key={lang} type="button" onClick={() => setDetailsTab(lang)}
              className={`pb-2 text-sm font-medium transition-colors ${
                detailsTab === lang
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}>
              {lang === 'es' ? 'Español' : 'English'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={loadDefaultTemplate}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-lime/10 text-green-800 border border-green-300 rounded-lg hover:bg-lime/20 transition-colors"
            title={t('sessionLoadTemplateHelp')}>
            ↺ {t('sessionLoadTemplate')}
          </button>
          <button type="button" onClick={copyFromOtherLanguage} disabled={translating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
            {detailsTab === 'es' ? t('copyFromEnglish') : t('copyFromSpanish')}
          </button>
          <button type="button" onClick={translateFromOtherLanguage} disabled={translating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors">
            {translating
              ? t('translating')
              : detailsTab === 'es' ? t('translateFromEnglish') : t('translateFromSpanish')}
          </button>
        </div>

        {translateError && <p className="text-xs text-red-600">{translateError}</p>}

        {detailsTab === 'es' ? (
          <PageBuilder blocks={blocksEs} onChange={setBlocksEs} uploadImage={uploadSessionImageAction} />
        ) : (
          <PageBuilder blocks={blocksEn} onChange={setBlocksEn} uploadImage={uploadSessionImageAction} />
        )}

        {/* Live preview toggle */}
        <button type="button" onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
            <circle cx="8" cy="8" r="2" />
          </svg>
          {showPreview ? t('hidePreview') : t('showPreview')}
        </button>

        {showPreview && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              {detailsTab === 'es' ? 'Vista previa' : 'Preview'}
            </p>
            {(detailsTab === 'es' ? blocksEs : blocksEn).length > 0 ? (
              <ExpeditionContent blocks={detailsTab === 'es' ? blocksEs : blocksEn} />
            ) : (
              <p className="text-sm text-gray-400 italic">
                {detailsTab === 'es' ? 'Sin contenido aún' : 'No content yet'}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          {t('cancel')}
        </button>
        <button type="submit" disabled={submitting} className={BUTTON_PRIMARY}>
          {submitting ? '...' : session ? t('editSession') : t('addSession')}
        </button>
      </div>
    </form>
  )
}
