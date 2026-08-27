'use client'

import { useState, useEffect } from 'react'
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
} from '@/app/actions/admin'
import type { ContentBlock } from '@/lib/types/admin'

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

type Section = 'blocks' | 'heroLocations'

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

  useEffect(() => {
    loadBlocks()
    loadHeroLocations()
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
      </div>

      {section === 'heroLocations' ? (
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
