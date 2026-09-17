'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { ContentPreview } from './ContentPreview'
import {
  getContentBlocksAction,
  updateContentBlockAction,
  reorderContentBlocksAction,
  getHeroLocationsAction,
  createHeroLocationAction,
  deleteHeroLocationAction,
  getTouristSurchargeAction,
  updateTouristSurchargeAction,
  getSpecialEventsBannerAction,
  updateSpecialEventsBannerAction,
  uploadSpecialEventImageAction,
} from '@/app/actions/admin'
import type { SpecialEventsBannerConfig } from '@/app/actions/admin'
import type { ContentBlock } from '@/lib/types/admin'
import { compressImage } from '@/lib/image-compress'
import { BUTTON_SOFT } from '@/lib/admin-styles'

interface HeroLocation {
  id: string
  name: string
  sort_order: number
  created_at: string
}

// TipTap is a heavy editor (~150 KB). Defer the bundle until an admin actually
// opens an editor — the CMS list itself doesn't need it.
const ContentEditor = dynamic(
  () => import('./ContentEditor').then((mod) => ({ default: mod.ContentEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-300 rounded-lg bg-white p-4 text-gray-500 text-sm">
        Loading editor…
      </div>
    ),
  }
)

type PageTab = 'learn' | 'faq' | 'contact'

const PAGE_TABS: { key: PageTab; labelKey: string }[] = [
  { key: 'learn', labelKey: 'learnBlocks' },
  { key: 'faq', labelKey: 'faqBlocks' },
  { key: 'contact', labelKey: 'contactBlocks' },
]

function formatBlockKey(key: string): string {
  // Remove page prefix (e.g., 'home_hero' -> 'Hero')
  const parts = key.split('_').slice(1)
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

type Section = 'blocks' | 'heroLocations' | 'seBanner' | 'settings'

export default function AdminCmsPage() {
  const t = useTranslations('Admin')
  const [section, setSection] = useState<Section>('blocks')
  const [activeTab, setActiveTab] = useState<PageTab>('learn')
  const [blocks, setBlocks] = useState<Record<PageTab, ContentBlock[]>>({
    learn: [],
    faq: [],
    contact: [],
  })
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [langTab, setLangTab] = useState<'es' | 'en'>('es')
  const [editEs, setEditEs] = useState('')
  const [editEn, setEditEn] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)

  // Hero locations state
  const [heroLocations, setHeroLocations] = useState<HeroLocation[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Special events banner state
  const [banner, setBanner] = useState<SpecialEventsBannerConfig>({
    title_es: '', title_en: '', subtitle_es: '', subtitle_en: '', image_url: '',
  })
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bannerSaved, setBannerSaved] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [bannerUploadFeedback, setBannerUploadFeedback] = useState<string | null>(null)
  const bannerFileRef = useRef<HTMLInputElement>(null)

  // Settings state
  const [surcharge, setSurcharge] = useState('')
  const [surchargeLoading, setSurchargeLoading] = useState(false)
  const [surchargeSaved, setSurchargeSaved] = useState(false)
  const [surchargeError, setSurchargeError] = useState<string | null>(null)

  useEffect(() => {
    loadBlocks()
    loadHeroLocations()
    loadSettings()
    loadBanner()
  }, [])

  async function loadHeroLocations() {
    try {
      const data = await getHeroLocationsAction()
      setHeroLocations(data)
    } catch (err) {
      console.error('Failed to load hero locations:', err)
    }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault()
    const name = newLocationName.trim()
    if (!name) return

    setAddingLocation(true)
    setLocationError(null)
    try {
      await createHeroLocationAction(name)
      setNewLocationName('')
      await loadHeroLocations()
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAddingLocation(false)
    }
  }

  async function handleDeleteLocation(id: string) {
    try {
      await deleteHeroLocationAction(id)
      await loadHeroLocations()
    } catch (err) {
      console.error('Failed to delete hero location:', err)
    }
  }

  async function loadBanner() {
    try {
      const data = await getSpecialEventsBannerAction()
      setBanner(data)
    } catch (err) {
      console.error('Failed to load banner:', err)
    }
  }

  async function handleSaveBanner(e: React.FormEvent) {
    e.preventDefault()
    setBannerSaving(true)
    setBannerError(null)
    try {
      await updateSpecialEventsBannerAction(banner)
      setBannerSaved(true)
      setTimeout(() => setBannerSaved(false), 2000)
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBannerSaving(false)
    }
  }

  async function handleBannerImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    setBannerUploadFeedback(null)
    try {
      const optimized = await compressImage(file)
      const fd = new FormData()
      fd.append('file', optimized)
      const { url } = await uploadSpecialEventImageAction(fd)
      setBanner((prev) => ({ ...prev, image_url: url }))
      setBannerUploadFeedback('Uploaded!')
      setTimeout(() => setBannerUploadFeedback(null), 3000)
    } catch {
      setBannerUploadFeedback('Upload failed. Please try again.')
      setTimeout(() => setBannerUploadFeedback(null), 4000)
    } finally {
      setBannerUploading(false)
      if (bannerFileRef.current) bannerFileRef.current.value = ''
    }
  }

  async function loadSettings() {
    try {
      const pct = await getTouristSurchargeAction()
      setSurcharge(String(pct))
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  async function handleSaveSurcharge(e: React.FormEvent) {
    e.preventDefault()
    const pct = parseInt(surcharge, 10)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setSurchargeError(t('invalidPrice'))
      return
    }
    setSurchargeLoading(true)
    setSurchargeError(null)
    try {
      await updateTouristSurchargeAction(pct)
      setSurchargeSaved(true)
      setTimeout(() => setSurchargeSaved(false), 2000)
    } catch (err) {
      setSurchargeError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSurchargeLoading(false)
    }
  }

  async function loadBlocks() {
    try {
      const grouped = await getContentBlocksAction()
      setBlocks(grouped)
    } catch (err) {
      console.error('Failed to load content blocks:', err)
    }
  }

  function startEditing(block: ContentBlock) {
    setEditingBlockId(block.id)
    setEditEs(block.content_es ?? '')
    setEditEn(block.content_en ?? '')
    setLangTab('es')
  }

  function cancelEditing() {
    setEditingBlockId(null)
  }

  async function handleSave(blockId: string) {
    setSaving(true)
    try {
      await updateContentBlockAction(blockId, editEs, editEn)
      setSavedFeedback(true)
      setTimeout(() => setSavedFeedback(false), 2000)
      await loadBlocks()
    } catch (err) {
      console.error('Failed to save content block:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleReorder(direction: 'up' | 'down', index: number) {
    const currentBlocks = [...blocks[activeTab]]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentBlocks.length) return

    // Swap
    const temp = currentBlocks[index]
    currentBlocks[index] = currentBlocks[targetIndex]
    currentBlocks[targetIndex] = temp

    // Optimistic update
    setBlocks((prev) => ({ ...prev, [activeTab]: currentBlocks }))

    try {
      await reorderContentBlocksAction(currentBlocks.map((b) => b.id))
    } catch (err) {
      console.error('Failed to reorder:', err)
      await loadBlocks() // revert
    }
  }

  const currentBlocks = blocks[activeTab]
  const currentContent = langTab === 'es' ? editEs : editEn

  return (
    <div>
      <h1 className="text-2xl font-bold text-midnight mb-6">{t('contentBlocks')}</h1>

      {/* Top-level section toggle: content blocks vs hero locations */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSection('blocks')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'blocks'
              ? 'bg-midnight text-white'
              : 'bg-white text-midnight border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('contentBlocks')}
        </button>
        <button
          onClick={() => setSection('heroLocations')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'heroLocations'
              ? 'bg-midnight text-white'
              : 'bg-white text-midnight border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('heroLocations')}
        </button>
        <button
          onClick={() => setSection('seBanner')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'seBanner'
              ? 'bg-midnight text-white'
              : 'bg-white text-midnight border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('seBanner')}
        </button>
        <button
          onClick={() => setSection('settings')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'settings'
              ? 'bg-midnight text-white'
              : 'bg-white text-midnight border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings')}
        </button>
      </div>

      {section === 'seBanner' ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">{t('seBannerHelp')}</p>
          <form onSubmit={handleSaveBanner} className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-midnight mb-1">{t('seBannerTitleEs')}</label>
                <input type="text" value={banner.title_es}
                  onChange={(e) => setBanner((p) => ({ ...p, title_es: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-midnight mb-1">{t('seBannerTitleEn')}</label>
                <input type="text" value={banner.title_en}
                  onChange={(e) => setBanner((p) => ({ ...p, title_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-midnight mb-1">{t('seBannerSubtitleEs')}</label>
                <input type="text" value={banner.subtitle_es}
                  onChange={(e) => setBanner((p) => ({ ...p, subtitle_es: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-midnight mb-1">{t('seBannerSubtitleEn')}</label>
                <input type="text" value={banner.subtitle_en}
                  onChange={(e) => setBanner((p) => ({ ...p, subtitle_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Banner image upload */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-midnight">{t('seBannerImage')}</label>

              <div className="flex flex-wrap items-center gap-3">
                <input ref={bannerFileRef} type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleBannerImageUpload} className="hidden" />
                <button type="button" disabled={bannerUploading}
                  onClick={() => bannerFileRef.current?.click()} className={BUTTON_SOFT}>
                  {bannerUploading ? t('uploading') : t('uploadFromDevice')}
                </button>
                {bannerUploadFeedback && (
                  <span className={`text-xs ${bannerUploadFeedback === 'Uploaded!' ? 'text-green-700' : 'text-red-600'}`}>
                    {bannerUploadFeedback}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="text" value={banner.image_url}
                  onChange={(e) => setBanner((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://... or upload above"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {banner.image_url && (
                  <button type="button" onClick={() => setBanner((p) => ({ ...p, image_url: '' }))}
                    aria-label="Remove image"
                    className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors text-lg">
                    ×
                  </button>
                )}
              </div>

              {banner.image_url && (
                <div className="relative rounded-lg overflow-hidden border border-gray-300 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.image_url} alt="" className="w-full h-40 object-cover" />
                </div>
              )}

              <p className="text-xs text-gray-500">{t('seBannerImageHelp')}</p>
            </div>

            {bannerError && <p className="text-red-600 text-sm">{bannerError}</p>}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={bannerSaving}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {bannerSaving ? t('saving') : t('save')}
              </button>
              {bannerSaved && <span className="text-green-700 text-sm">{t('seBannerSaved')}</span>}
            </div>
          </form>
        </div>
      ) : section === 'settings' ? (
        <div className="space-y-4">
          <form onSubmit={handleSaveSurcharge} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <label htmlFor="tourist-surcharge" className="block text-sm font-medium text-midnight mb-1">
                {t('touristSurcharge')}
              </label>
              <p className="text-xs text-gray-500 mb-2">{t('surchargeDescription')}</p>
              <div className="flex items-center gap-2">
                <input
                  id="tourist-surcharge"
                  type="number"
                  min={0}
                  max={100}
                  value={surcharge}
                  onChange={(e) => setSurcharge(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
            {surchargeError && <p className="text-red-600 text-sm">{surchargeError}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={surchargeLoading}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {surchargeLoading ? t('saving') : t('save')}
              </button>
              {surchargeSaved && <span className="text-green-700 text-sm">{t('surchargeSaved')}</span>}
            </div>
          </form>
        </div>
      ) : section === 'heroLocations' ? (
        <div className="space-y-4">
          <form onSubmit={handleAddLocation} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="hero-location-name" className="block text-sm font-medium text-midnight mb-1">
                {t('heroLocationName')}
              </label>
              <input
                id="hero-location-name"
                type="text"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder={t('heroLocationPlaceholder')}
                maxLength={80}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={addingLocation || !newLocationName.trim()}
              className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {addingLocation ? t('saving') : t('addHeroLocation')}
            </button>
          </form>

          {locationError && (
            <p className="text-red-600 text-sm">{locationError}</p>
          )}

          {heroLocations.length === 0 ? (
            <p className="text-gray-600 text-center py-12">{t('noHeroLocations')}</p>
          ) : (
            <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
              {heroLocations.map((loc) => (
                <li key={loc.id} className="flex items-center justify-between p-4">
                  <span className="text-midnight font-medium">{loc.name}</span>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="text-xs text-red-600 hover:underline px-3 py-1"
                  >
                    {t('delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <>
      {/* Page tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-300">
        {PAGE_TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key)
              setEditingBlockId(null)
            }}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-midnight'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Block list */}
      {currentBlocks.length === 0 ? (
        <p className="text-gray-600 text-center py-12">No content blocks found for this page.</p>
      ) : (
        <div className="space-y-4">
          {currentBlocks.map((block, index) => {
            const isEditing = editingBlockId === block.id

            return (
              <div key={block.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-midnight font-medium">
                      {formatBlockKey(block.block_key)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('lastUpdated')}: {new Date(block.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => handleReorder('up', index)}
                      disabled={index === 0}
                      className="text-xs text-gray-500 hover:text-midnight disabled:opacity-30 px-2 py-1"
                      title={t('moveUp')}
                    >
                      {'\u2191'}
                    </button>
                    <button
                      onClick={() => handleReorder('down', index)}
                      disabled={index === currentBlocks.length - 1}
                      className="text-xs text-gray-500 hover:text-midnight disabled:opacity-30 px-2 py-1"
                      title={t('moveDown')}
                    >
                      {'\u2193'}
                    </button>
                    <button
                      onClick={() => (isEditing ? cancelEditing() : startEditing(block))}
                      className="text-xs text-midnight font-medium hover:underline px-3 py-1"
                    >
                      {isEditing ? t('cancel') : t('editContent')}
                    </button>
                  </div>
                </div>

                {/* Expanded editor */}
                {isEditing && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    {/* Language tabs */}
                    <div className="flex gap-3">
                      {(['es', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLangTab(lang)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            langTab === lang
                              ? 'bg-blue-50 text-blue-700 border border-blue-500'
                              : 'text-gray-600 hover:text-midnight bg-white border border-gray-200'
                          }`}
                        >
                          {lang === 'es' ? t('spanishContent') : t('englishContent')}
                        </button>
                      ))}
                    </div>

                    {/* Editor */}
                    <ContentEditor
                      content={currentContent}
                      onChange={(html) => {
                        if (langTab === 'es') setEditEs(html)
                        else setEditEn(html)
                      }}
                    />

                    {/* Preview */}
                    <ContentPreview html={currentContent} />

                    {/* Save button */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSave(block.id)}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? t('saving') : t('save')}
                      </button>
                      {savedFeedback && (
                        <span className="text-green-700 text-sm">{t('saved')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}
