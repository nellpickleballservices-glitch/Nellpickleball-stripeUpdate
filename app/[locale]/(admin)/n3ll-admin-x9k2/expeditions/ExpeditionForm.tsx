'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { uploadExpeditionImageAction } from '@/app/actions/admin/expeditions'
import { translateExpeditionContentAction } from '@/app/actions/admin'
import type { TranslatePayload } from '@/app/actions/admin/translate'
import { compressImage } from '@/lib/image-compress'
import { FIELD_FULL, FIELD_LABEL, BUTTON_PRIMARY } from '@/lib/admin-styles'
import type { Expedition } from '@/lib/types/admin'
import { parseBlocks, type Block } from '@/lib/types/expedition-blocks'
import { ExpeditionContent } from '@/components/public/ExpeditionContent'

// Deep-clone blocks and reassign fresh IDs so the copied tab's React keys
// don't collide with the source tab and the two tabs stay independent.
function cloneBlocksWithNewIds(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    const cloned = JSON.parse(JSON.stringify(b)) as Block
    cloned.id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
    return cloned
  })
}

// PageBuilder is only used when an admin opens this form — defer its bundle
// (and its dependencies) until then instead of shipping it on the list page.
const PageBuilder = dynamic(
  () => import('./PageBuilder').then((mod) => ({ default: mod.PageBuilder })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-gray-500 italic text-center py-6 border border-dashed border-gray-300 rounded-lg bg-white">
        Loading editor…
      </p>
    ),
  }
)

interface ExpeditionFormProps {
  expedition?: Expedition
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

function initialImages(expedition?: Expedition): string[] {
  if (expedition?.image_urls && expedition.image_urls.length > 0) return expedition.image_urls
  if (expedition?.image_url) return [expedition.image_url]
  return []
}

export function ExpeditionForm({ expedition, onSubmit, onCancel }: ExpeditionFormProps) {
  const t = useTranslations('Admin')
  const [submitting, setSubmitting] = useState(false)
  const [titleEs, setTitleEs] = useState(expedition?.title_es ?? '')
  const [titleEn, setTitleEn] = useState(expedition?.title_en ?? '')
  const [descriptionEs, setDescriptionEs] = useState(expedition?.description_es ?? '')
  const [descriptionEn, setDescriptionEn] = useState(expedition?.description_en ?? '')
  const [blocksEs, setBlocksEs] = useState<Block[]>(parseBlocks(expedition?.details_es))
  const [blocksEn, setBlocksEn] = useState<Block[]>(parseBlocks(expedition?.details_en))
  const [detailsTab, setDetailsTab] = useState<'es' | 'en'>('es')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>(initialImages(expedition))
  const [urlDraft, setUrlDraft] = useState('')
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Copies the OTHER language's title, description, and blocks into the
   * currently-active tab — no API call, no translation. Useful when admins
   * want to bring images/layout over without paying for AI translation.
   */
  function copyFromOtherLanguage() {
    setTranslateError(null)
    if (detailsTab === 'es') {
      // Filling ES from EN
      setTitleEs(titleEn)
      setDescriptionEs(descriptionEn)
      setBlocksEs(cloneBlocksWithNewIds(blocksEn))
    } else {
      // Filling EN from ES
      setTitleEn(titleEs)
      setDescriptionEn(descriptionEs)
      setBlocksEn(cloneBlocksWithNewIds(blocksEs))
    }
  }

  /**
   * Sends the OTHER language's title/description/blocks through OpenAI and
   * applies the translated result to the currently-active tab. Preserves
   * image URLs, layout, link styles, etc. — only text fields change.
   */
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
        const { url } = await uploadExpeditionImageAction(fd)
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

  function addUrl() {
    const url = urlDraft.trim()
    if (!url) return
    setImages((prev) => [...prev, url])
    setUrlDraft('')
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  function moveImage(from: number, to: number) {
    setImages((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (images.length === 0) {
      setUploadFeedback('Add at least one image.')
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      // Inject values not captured by native form elements
      formData.set('details_es', JSON.stringify(blocksEs))
      formData.set('details_en', JSON.stringify(blocksEn))
      formData.set('image_urls', JSON.stringify(images))
      await onSubmit(formData)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = FIELD_FULL
  const labelCls = FIELD_LABEL

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">
        {expedition ? t('editExpedition') : t('addExpedition')}
      </h2>

      {/* ── SECTION 1: Card info ── */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('expeditionCardInfo')}
        </p>

        {/* Bilingual titles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('expeditionTitleEs')}</label>
            <input
              name="title_es"
              type="text"
              required
              value={titleEs}
              onChange={(e) => setTitleEs(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('expeditionTitleEn')}</label>
            <input
              name="title_en"
              type="text"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Bilingual short descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('expeditionDescriptionEs')}</label>
            <textarea
              name="description_es"
              rows={3}
              value={descriptionEs}
              onChange={(e) => setDescriptionEs(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t('expeditionDescriptionEn')}</label>
            <textarea
              name="description_en"
              rows={3}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Images — upload or paste URLs; the first image is the carousel cover */}
        <div className="space-y-3">
          <label className={labelCls}>{t('expeditionImageUrl')}</label>
          <p className="text-xs text-gray-500 -mt-1">
            The first image is the cover. Add more to show an auto-cycling carousel on the card and detail page.
          </p>

          {/* image_urls travels with the form as JSON (see handleSubmit) */}
          <input type="hidden" name="image_urls" value={JSON.stringify(images)} />

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                    <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                  </svg>
                  Upload from device
                </>
              )}
            </button>
            {uploadFeedback && (
              <span className={`text-xs ${uploadFeedback === 'Uploaded!' ? 'text-green-700' : 'text-red-600'}`}>
                {uploadFeedback}
              </span>
            )}
          </div>

          {/* Paste a URL */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addUrl()
                }
              }}
              placeholder="https://... then press Add"
              className={inputCls}
            />
            <button
              type="button"
              onClick={addUrl}
              className="shrink-0 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Selected images */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative rounded-lg overflow-hidden border border-gray-300 bg-white">
                  <img
                    src={url}
                    alt=""
                    className="w-full h-28 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(i, i - 1)}
                        disabled={i === 0}
                        aria-label="Move earlier"
                        className="grid place-items-center w-6 h-6 rounded bg-black/50 text-white text-xs hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, i + 1)}
                        disabled={i === images.length - 1}
                        aria-label="Move later"
                        className="grid place-items-center w-6 h-6 rounded bg-black/50 text-white text-xs hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                      className="grid place-items-center w-6 h-6 rounded bg-red-500/70 text-white text-sm hover:bg-red-500"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-red-300">Add at least one image.</p>
          )}
        </div>

        {/* Dates + visibility + sort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('expeditionStartDate')}</label>
            <input name="start_date" type="date" required defaultValue={expedition?.start_date ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('expeditionEndDate')}</label>
            <input name="end_date" type="date" required defaultValue={expedition?.end_date ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t('expeditionExpirationDate')}</label>
            <input name="expires_at" type="date" defaultValue={expedition?.expires_at ?? ''} className={inputCls} />
            <p className="text-xs text-gray-500 mt-1">{t('expeditionExpirationDateHelp')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('expeditionSortOrder')}</label>
            <input name="sort_order" type="number" min="0" defaultValue={expedition?.sort_order ?? 0} className={inputCls} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                name="is_published"
                type="checkbox"
                defaultChecked={expedition?.is_published ?? false}
                className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
              />
              {t('expeditionPublished')}
            </label>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Detail content ── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
          {t('expeditionDetailContent')}
        </p>

        {/* Language tabs */}
        <div className="flex gap-4 border-b border-gray-300">
          {(['es', 'en'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setDetailsTab(lang)}
              className={`pb-2 text-sm font-medium transition-colors ${
                detailsTab === lang
                  ? 'text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {lang === 'es' ? 'Español' : 'English'}
            </button>
          ))}
        </div>

        {/* Cross-language helpers — operate on the currently active tab and
            pull from the other language. Copy is free; translate uses OpenAI. */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyFromOtherLanguage}
            disabled={translating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title={t('copyFromOtherLanguageHelp')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
              <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
            </svg>
            {detailsTab === 'es' ? t('copyFromEnglish') : t('copyFromSpanish')}
          </button>
          <button
            type="button"
            onClick={translateFromOtherLanguage}
            disabled={translating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            title={t('translateFromOtherLanguageHelp')}
          >
            {translating ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('translating')}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M7.55 12.797a18 18 0 0 1-2.043-.797 18 18 0 0 0 4.443-4.5h-4.7l.001-1.5h4.95V4.5h1.5V6h4.953v1.5h-1.954a17.96 17.96 0 0 1-2.477 3.749 17.926 17.926 0 0 0 4.181 2.078 7.5 7.5 0 0 0-.5 1.471 19.43 19.43 0 0 1-4.808-2.476 18 18 0 0 1-3.567 2.475l-.93-1.5a16.5 16.5 0 0 0 3.198-2.226 18.04 18.04 0 0 1-2.247-3.071ZM15.499 14l-3.751 4-2.5-2.5 1.5-1.5 1 1L14 13l1.5 1Z" />
                </svg>
                {detailsTab === 'es' ? t('translateFromEnglish') : t('translateFromSpanish')}
              </>
            )}
          </button>
        </div>

        {translateError && (
          <p className="text-xs text-red-600">{translateError}</p>
        )}

        {detailsTab === 'es' && (
          <PageBuilder blocks={blocksEs} onChange={setBlocksEs} />
        )}
        {detailsTab === 'en' && (
          <PageBuilder blocks={blocksEn} onChange={setBlocksEn} />
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

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
        <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={BUTTON_PRIMARY}
        >
          {submitting ? '...' : expedition ? t('editExpedition') : t('addExpedition')}
        </button>
      </div>
    </form>
  )
}
