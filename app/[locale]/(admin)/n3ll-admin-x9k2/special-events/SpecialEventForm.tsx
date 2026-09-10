'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { uploadSpecialEventImageAction } from '@/app/actions/admin/special-events'
import { translateExpeditionContentAction } from '@/app/actions/admin'
import type { TranslatePayload } from '@/app/actions/admin/translate'
import { compressImage } from '@/lib/image-compress'
import { FIELD_FULL, FIELD_LABEL, BUTTON_PRIMARY, BUTTON_SOFT } from '@/lib/admin-styles'
import { parseBlocks, type Block } from '@/lib/types/expedition-blocks'
import { formatSessionDate } from '@/lib/sessions'
import type { SpecialEvent } from '@/lib/types/special-events'

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

interface SpecialEventFormProps {
  event?: SpecialEvent
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

export function SpecialEventForm({ event, onSubmit, onCancel }: SpecialEventFormProps) {
  const t = useTranslations('Admin')
  const locale = useLocale()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [titleEs, setTitleEs] = useState(event?.title_es ?? '')
  const [titleEn, setTitleEn] = useState(event?.title_en ?? '')
  const [descriptionEs, setDescriptionEs] = useState(event?.description_es ?? '')
  const [descriptionEn, setDescriptionEn] = useState(event?.description_en ?? '')

  const [eventDate, setEventDate] = useState(event?.event_date ?? '')
  const [startTime, setStartTime] = useState((event?.start_time ?? '18:00').slice(0, 5))
  const [endTime, setEndTime] = useState((event?.end_time ?? '20:00').slice(0, 5))
  const [capacity, setCapacity] = useState(event?.capacity ?? 20)

  const [cardSize, setCardSize] = useState(event?.card_size ?? 'normal')

  // Promo pricing
  const [promoEnabled, setPromoEnabled] = useState(
    event?.promo_price_cents != null && event?.promo_expires_at != null
  )
  const [promoPrice, setPromoPrice] = useState(
    event?.promo_price_cents != null ? (event.promo_price_cents / 100).toFixed(2) : ''
  )
  const [promoExpiresAt, setPromoExpiresAt] = useState(
    event?.promo_expires_at ? event.promo_expires_at.slice(0, 16) : '' // datetime-local format
  )

  // Hero/banner
  const [heroTitleEs, setHeroTitleEs] = useState(event?.hero_title_es ?? '')
  const [heroTitleEn, setHeroTitleEn] = useState(event?.hero_title_en ?? '')
  const [heroSubtitleEs, setHeroSubtitleEs] = useState(event?.hero_subtitle_es ?? '')
  const [heroSubtitleEn, setHeroSubtitleEn] = useState(event?.hero_subtitle_en ?? '')
  const [heroImageUrl, setHeroImageUrl] = useState(event?.hero_image_url ?? '')

  const [images, setImages] = useState<string[]>(
    event?.image_urls?.length ? event.image_urls : event?.image_url ? [event.image_url] : []
  )
  const [urlDraft, setUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [blocksEs, setBlocksEs] = useState<Block[]>(parseBlocks(event?.details_es))
  const [blocksEn, setBlocksEn] = useState<Block[]>(parseBlocks(event?.details_en))
  const [detailsTab, setDetailsTab] = useState<'es' | 'en'>('es')
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

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
        const { url } = await uploadSpecialEventImageAction(fd)
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

    if (!eventDate) {
      setError('Event date is required')
      return
    }
    if (endTime <= startTime) {
      setError(t('sessionErrorTimeOrder'))
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('event_date', eventDate)
      formData.set('image_urls', JSON.stringify(images))
      formData.set('details_es', JSON.stringify(blocksEs))
      formData.set('details_en', JSON.stringify(blocksEn))
      formData.set('card_size', cardSize)
      if (!promoEnabled) {
        formData.delete('promo_enabled')
        formData.delete('promo_price')
        formData.delete('promo_expires_at')
      }
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const inputCls = FIELD_FULL
  const labelCls = FIELD_LABEL

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">
        {event ? t('seEditEvent') : t('seAddEvent')}
      </h2>

      {/* ── SECTION 1: Card info ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
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
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white">
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
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
          {t('sessionSchedule')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('seEventDate')}</label>
            <input type="date" required value={eventDate} min={today}
              onChange={(e) => setEventDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionStartTime')}</label>
            <input name="start_time" type="time" required value={startTime}
              onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionEndTime')}</label>
            <input name="end_time" type="time" required value={endTime}
              onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
          </div>
        </div>

        {eventDate && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-1">
              {t('seEventPreview')}
            </p>
            <p className="text-sm text-gray-700">
              {formatSessionDate(eventDate, locale)}
            </p>
          </div>
        )}
      </div>

      {/* ── SECTION 3: Capacity, payment, promo pricing ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
          {t('sessionCapacityPayment')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('sessionCapacity')}</label>
            <input name="capacity" type="number" min={1} max={500} required value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('seCapacityHelp')}</p>
          </div>
          <div>
            <label className={labelCls}>{t('sessionPrice')}</label>
            <input name="price" type="number" min={0} step="0.01"
              defaultValue={((event?.price_cents ?? 0) / 100).toFixed(2)} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('seRegularPriceHelp')}</p>
          </div>
          <div>
            <label className={labelCls}>{t('sessionCurrency')}</label>
            <select name="currency" defaultValue={event?.currency ?? 'usd'} className={inputCls}>
              <option value="usd">USD</option>
              <option value="dop">DOP</option>
            </select>
          </div>
        </div>

        {/* Promo pricing */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-5 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-purple-800 cursor-pointer">
            <input name="promo_enabled" type="checkbox" checked={promoEnabled}
              onChange={(e) => setPromoEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
            {t('seEnablePromo')}
          </label>
          <p className="text-xs text-purple-600">{t('sePromoHelp')}</p>

          {promoEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('sePromoPrice')}</label>
                <input name="promo_price" type="number" min={0} step="0.01" value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('sePromoExpires')}</label>
                <input name="promo_expires_at" type="datetime-local" value={promoExpiresAt}
                  onChange={(e) => setPromoExpiresAt(e.target.value)} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">{t('sePromoExpiresHelp')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="allow_stripe" type="checkbox" defaultChecked={event?.allow_stripe ?? true}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
            {t('sessionAllowStripe')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input name="allow_cash" type="checkbox" defaultChecked={event?.allow_cash ?? true}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
            {t('sessionAllowCash')}
          </label>
        </div>
      </div>

      {/* ── SECTION 4: Display options ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
          {t('seDisplayOptions')}
        </p>

        <div>
          <label className={labelCls}>{t('seCardSize')}</label>
          <div className="flex flex-wrap gap-2">
            {(['normal', 'large', 'featured'] as const).map((size) => (
              <button key={size} type="button" onClick={() => setCardSize(size)}
                aria-pressed={cardSize === size}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  cardSize === size
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}>
                {t(`seCardSize_${size}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1.5">{t('seCardSizeHelp')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('sessionLocation')}</label>
            <input name="location_name" type="text" defaultValue={event?.location_name ?? ''}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('sessionSortOrder')}</label>
            <input name="sort_order" type="number" min={0} defaultValue={event?.sort_order ?? 0}
              className={inputCls} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input name="is_published" type="checkbox" defaultChecked={event?.is_published ?? false}
                className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500" />
              {t('sessionPublished')}
            </label>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Hero/banner customization ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
          {t('seHeroBanner')}
        </p>
        <p className="text-xs text-gray-500 -mt-2">{t('seHeroBannerHelp')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('seHeroTitleEs')}</label>
            <input name="hero_title_es" type="text" value={heroTitleEs}
              onChange={(e) => setHeroTitleEs(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('seHeroTitleEn')}</label>
            <input name="hero_title_en" type="text" value={heroTitleEn}
              onChange={(e) => setHeroTitleEn(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('seHeroSubtitleEs')}</label>
            <input name="hero_subtitle_es" type="text" value={heroSubtitleEs}
              onChange={(e) => setHeroSubtitleEs(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('seHeroSubtitleEn')}</label>
            <input name="hero_subtitle_en" type="text" value={heroSubtitleEn}
              onChange={(e) => setHeroSubtitleEn(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('seHeroImage')}</label>
          <input name="hero_image_url" type="text" value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://..." className={inputCls} />
          <p className="text-xs text-gray-500 mt-1">{t('seHeroImageHelp')}</p>
        </div>
      </div>

      {/* ── SECTION 6: Page content ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">
          {t('sessionPageContent')}
        </p>
        <p className="text-xs text-gray-500 -mt-2">{t('sessionPageContentHelp')}</p>

        <div className="flex gap-4 border-b border-gray-300">
          {(['es', 'en'] as const).map((lang) => (
            <button key={lang} type="button" onClick={() => setDetailsTab(lang)}
              className={`pb-2 text-sm font-medium transition-colors ${
                detailsTab === lang
                  ? 'text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}>
              {lang === 'es' ? 'Español' : 'English'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
          <PageBuilder blocks={blocksEs} onChange={setBlocksEs} uploadImage={uploadSpecialEventImageAction} />
        ) : (
          <PageBuilder blocks={blocksEn} onChange={setBlocksEn} uploadImage={uploadSpecialEventImageAction} />
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
          {submitting ? '...' : event ? t('seEditEvent') : t('seAddEvent')}
        </button>
      </div>
    </form>
  )
}
