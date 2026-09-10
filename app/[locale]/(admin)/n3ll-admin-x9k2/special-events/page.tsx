'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { SpecialEventForm } from './SpecialEventForm'
import { SpecialEventSignupsPanel } from './SignupsPanel'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  getSpecialEventsAction,
  createSpecialEventAction,
  updateSpecialEventAction,
  deleteSpecialEventAction,
} from '@/app/actions/admin/special-events'
import { formatSessionTimeRange, formatPrice, formatSessionDate } from '@/lib/sessions'
import type { SpecialEvent } from '@/lib/types/special-events'

export default function AdminSpecialEventsPage() {
  const t = useTranslations('Admin')
  const locale = useLocale()

  const [events, setEvents] = useState<SpecialEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SpecialEvent | undefined>()
  const [roster, setRoster] = useState<SpecialEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setEvents(await getSpecialEventsAction())
    } catch (err) {
      console.error('Failed to load special events:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleCreate(formData: FormData) {
    await createSpecialEventAction(formData)
    setShowForm(false)
    showFeedback(t('seEventCreated'))
    await load()
  }

  async function handleUpdate(formData: FormData) {
    if (!editing) return
    await updateSpecialEventAction(editing.id, formData)
    setEditing(undefined)
    setShowForm(false)
    showFeedback(t('seEventUpdated'))
    await load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSpecialEventAction(deleteTarget)
      setDeleteTarget(null)
      showFeedback(t('seEventDeleted'))
      await load()
    } finally {
      setDeleting(false)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  const cardSizeLabels: Record<string, string> = {
    normal: t('seCardSize_normal'),
    large: t('seCardSize_large'),
    featured: t('seCardSize_featured'),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-midnight">{t('specialEvents')}</h1>
        {!showForm && (
          <button
            onClick={() => { setRoster(null); setShowForm(true) }}
            className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
          >
            {t('seAddEvent')}
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 text-sm">
          {feedback}
        </div>
      )}

      {roster && <SpecialEventSignupsPanel event={roster} onClose={() => setRoster(null)} />}

      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <SpecialEventForm
            event={editing}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      ) : loading ? (
        <p className="text-gray-500 text-center py-12">{t('loading')}</p>
      ) : events.length === 0 ? (
        <p className="text-gray-600 text-center py-12">{t('seNoEvents')}</p>
      ) : (
        <div className="grid gap-4">
          {events.map((ev) => {
            const hasPromo = ev.promo_price_cents != null && ev.promo_expires_at != null
            const promoActive = hasPromo && new Date(ev.promo_expires_at!) > new Date()
            const isPast = ev.event_date < new Date().toISOString().slice(0, 10)

            return (
              <div key={ev.id} className={`bg-white border rounded-lg shadow-sm p-5 ${isPast ? 'border-gray-300 opacity-60' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-midnight font-semibold text-base">{ev.title_en}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      ev.card_size === 'featured'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : ev.card_size === 'large'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {cardSizeLabels[ev.card_size]}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ev.is_published ? 'text-green-700' : 'text-red-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${ev.is_published ? 'bg-green-500' : 'bg-red-500'}`} />
                    {ev.is_published ? t('sessionPublished') : t('unpublished')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">{t('seEventDate')}</span>
                    <span className="text-gray-800 text-xs">
                      {formatSessionDate(ev.event_date, locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">{t('sessionTime')}</span>
                    <span className="text-gray-800">{formatSessionTimeRange(ev.start_time, ev.end_time, locale)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">{t('sessionCapacity')}</span>
                    <span className="text-gray-800">{ev.capacity}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs block mb-0.5">{t('sessionPrice')}</span>
                    <span className="text-gray-800">
                      {ev.price_cents === 0 ? t('free') : formatPrice(ev.price_cents, ev.currency, locale)}
                    </span>
                  </div>
                </div>

                {hasPromo && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
                    promoActive
                      ? 'bg-purple-50 border border-purple-200 text-purple-800'
                      : 'bg-gray-50 border border-gray-200 text-gray-500 line-through'
                  }`}>
                    {t('sePromoLabel')}: {formatPrice(ev.promo_price_cents!, ev.currency, locale)}
                    {' — '}
                    {promoActive ? t('sePromoActiveUntil') : t('sePromoExpired')}
                    {' '}
                    {new Date(ev.promo_expires_at!).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-DO', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                )}

                <div className="flex gap-3 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => { setShowForm(false); setRoster(ev) }}
                    className="text-purple-700 font-medium hover:underline text-xs"
                  >
                    {t('sessionViewSignups')}
                  </button>
                  <button
                    onClick={() => { setRoster(null); setEditing(ev); setShowForm(true) }}
                    className="text-midnight font-medium hover:underline text-xs"
                  >
                    {t('seEditEvent')}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(ev.id)}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('seConfirmDeleteEvent')}
        message={t('seConfirmDeleteEventMessage')}
        confirmLabel={t('confirm')}
        destructive
        loading={deleting}
      />
    </div>
  )
}
