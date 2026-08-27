'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { uploadGalleryFileAction } from '@/app/actions/admin'
import { compressImage } from '@/lib/image-compress'
import { FIELD_FULL, BUTTON_PRIMARY } from '@/lib/admin-styles'
import type { GalleryItem, GalleryMediaType, GalleryGridSize } from '@/lib/types/admin'

interface GalleryItemFormProps {
  item?: GalleryItem
  onSubmit: (formData: FormData) => Promise<void>
  onCancel: () => void
}

const MEDIA_TYPES: GalleryMediaType[] = ['image', 'video']
const GRID_SIZES: GalleryGridSize[] = ['1x1', '1x2', '2x1', '2x2']

const GRID_SIZE_LABELS: Record<GalleryGridSize, string> = {
  '1x1': '1×1 (Small)',
  '1x2': '1×2 (Tall)',
  '2x1': '2×1 (Wide)',
  '2x2': '2×2 (Large)',
}

export function GalleryItemForm({ item, onSubmit, onCancel }: GalleryItemFormProps) {
  const t = useTranslations('Admin')
  const [submitting, setSubmitting] = useState(false)
  const [mediaType, setMediaType] = useState<GalleryMediaType>(item?.media_type ?? 'image')
  const [uploading, setUploading] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null)
  const [compressPercent, setCompressPercent] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(item?.url ?? null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData(e.currentTarget)
      await onSubmit(formData)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadFeedback(null)
    setCompressPercent(null)

    try {
      let optimized: File = file
      if (mediaType === 'image') {
        optimized = await compressImage(file)
      } else if (mediaType === 'video') {
        // Lazy-load ffmpeg.wasm so non-video admin sessions don't pay the cost.
        setUploadFeedback(t('galleryLoadingCompressor'))
        const { compressVideo } = await import('@/lib/video-compress')
        optimized = await compressVideo(file, {
          onReady: () => setUploadFeedback(t('galleryCompressing')),
          onProgress: (ratio) => setCompressPercent(Math.round(ratio * 100)),
        })
        setCompressPercent(null)
      }

      setUploadFeedback(t('galleryUploading'))
      const fd = new FormData()
      fd.append('file', optimized)
      const { url } = await uploadGalleryFileAction(fd)

      // Fill in the URL input
      if (urlInputRef.current) {
        urlInputRef.current.value = url
      }
      setPreviewUrl(url)
      setUploadFeedback(t('galleryUploadSuccess'))
      setTimeout(() => setUploadFeedback(null), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadFeedback(t('galleryUploadError'))
      setTimeout(() => setUploadFeedback(null), 4000)
    } finally {
      setUploading(false)
      setCompressPercent(null)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-midnight">
        {item ? t('editGalleryItem') : t('addGalleryItem')}
      </h2>

      {/* Media type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryMediaType')}</label>
          <select
            name="media_type"
            required
            defaultValue={item?.media_type ?? 'image'}
            onChange={(e) => setMediaType(e.target.value as GalleryMediaType)}
            className={FIELD_FULL}
          >
            {MEDIA_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(type === 'image' ? 'galleryImage' : 'galleryVideo')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload + URL section — same flow for images and videos.
          For images the file is compressed client-side before upload (WebP).
          Videos are passed through as-is since browser-side re-encoding is
          impractical at this size; admins should pre-compress with HandBrake
          or similar if storage is tight. */}
      <div className="space-y-3">
        <label className="block text-sm text-gray-700">{t('galleryUrl')}</label>

        {/* Upload button */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept={
              mediaType === 'video'
                ? 'video/mp4,video/webm,video/quicktime'
                : 'image/jpeg,image/png,image/webp,image/gif'
            }
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
                {t('galleryUploading')}
              </>
            ) : (
              <>
                {/* Upload icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                {t('galleryUploadFile')}
              </>
            )}
          </button>
          <span className="text-xs text-gray-500">{t('galleryOrPasteUrl')}</span>
        </div>

        {/* Upload feedback */}
        {uploadFeedback && (
          <p className={`text-xs ${
            uploadFeedback.includes('!')
              ? 'text-green-700'
              : uploadFeedback === t('galleryUploadError')
                ? 'text-red-600'
                : 'text-gray-600'
          }`}>
            {uploadFeedback}
            {compressPercent !== null && ` ${compressPercent}%`}
          </p>
        )}

        {/* URL input */}
        <input
          ref={urlInputRef}
          name="url"
          type="text"
          required
          defaultValue={item?.url ?? ''}
          placeholder="https://..."
          onChange={(e) => setPreviewUrl(e.target.value || null)}
          className={FIELD_FULL}
        />

        {/* Preview */}
        {previewUrl && mediaType === 'image' && (
          <div className="mt-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-40 rounded-lg border border-gray-300 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block' }}
            />
          </div>
        )}
        {previewUrl && mediaType === 'video' && (
          <div className="mt-2">
            <video
              src={previewUrl}
              controls
              className="max-h-40 rounded-lg border border-gray-300 bg-black"
            />
          </div>
        )}
      </div>

      {/* Thumbnail URL (for videos) */}
      {mediaType === 'video' && (
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryThumbnailUrl')}</label>
          <input
            name="thumbnail_url"
            type="text"
            defaultValue={item?.thumbnail_url ?? ''}
            placeholder="https://..."
            className={FIELD_FULL}
          />
        </div>
      )}

      {/* Bilingual titles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryTitleEs')}</label>
          <input
            name="title_es"
            type="text"
            defaultValue={item?.title_es ?? ''}
            className={FIELD_FULL}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryTitleEn')}</label>
          <input
            name="title_en"
            type="text"
            defaultValue={item?.title_en ?? ''}
            className={FIELD_FULL}
          />
        </div>
      </div>

      {/* Bilingual captions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryCaptionEs')}</label>
          <textarea
            name="caption_es"
            rows={2}
            defaultValue={item?.caption_es ?? ''}
            className={FIELD_FULL}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryCaptionEn')}</label>
          <textarea
            name="caption_en"
            rows={2}
            defaultValue={item?.caption_en ?? ''}
            className={FIELD_FULL}
          />
        </div>
      </div>

      {/* Grid size, sort order, visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('galleryGridSize')}</label>
          <select
            name="grid_size"
            required
            defaultValue={item?.grid_size ?? '1x1'}
            className={FIELD_FULL}
          >
            {GRID_SIZES.map((size) => (
              <option key={size} value={size}>
                {GRID_SIZE_LABELS[size]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">{t('gallerySortOrder')}</label>
          <input
            name="sort_order"
            type="number"
            min="0"
            defaultValue={item?.sort_order ?? 0}
            className={FIELD_FULL}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              name="is_visible"
              type="checkbox"
              defaultChecked={item?.is_visible ?? true}
              className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
            />
            {t('galleryVisible')}
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className={BUTTON_PRIMARY}
        >
          {submitting ? '...' : item ? t('editGalleryItem') : t('addGalleryItem')}
        </button>
      </div>
    </form>
  )
}
