'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { SessionForm } from './SessionForm'
import { SignupsPanel } from './SignupsPanel'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  getSessionsAction,
  createSessionAction,
  updateSessionAction,
  deleteSessionAction,
} from '@/app/actions/admin/sessions'
import { formatSessionTimeRange, formatPrice, formatSessionDate } from '@/lib/sessions'
import type { PlaySession, DayOfWeek } from '@/lib/types/sessions'

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

function weekdayInitials(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-DO', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  // 2024-01-07 was a Sunday, so index 0 lines up with getDay().
  return ALL_DAYS.map((d) => fmt.format(new Date(Date.UTC(2024, 0, 7 + d))))
}

export default function AdminSessionsPage() {
  const t = useTranslations('Admin')
  const locale = useLocale()
  const dayNames = weekdayInitials(locale)

  const [sessions, setSessions] = useState<PlaySession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PlaySession | undefined>()
  const [roster, setRoster] = useState<PlaySession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSessions(await getSessionsAction())
    } catch (err) {
      console.error('Failed to load sessions:', err)
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
    await createSessionAction(formData)
    setShowForm(false)
    showFeedback(t('sessionCreated'))
    await load()
  }

  async function handleUpdate(formData: FormData) {
    if (!editing) return
    await updateSessionAction(editing.id, formData)
    setEditing(undefined)
    setShowForm(false)
    showFeedback(t('sessionUpdated'))
    await load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSessionAction(deleteTarget)
      setDeleteTarget(null)
      showFeedback(t('sessionDeleted'))
      await load()
    } finally {
      setDeleting(false)
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-midnight">{t('sessions')}</h1>
        {!showForm && (
          <button
            onClick={() => { setRoster(null); setShowForm(true) }}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            {t('addSession')}
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
          {feedback}
        </div>
      )}

      {roster && <SignupsPanel session={roster} onClose={() => setRoster(null)} />}

      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <SessionForm
            session={editing}
            onSubmit={editing ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      ) : loading ? (
        <p className="text-gray-500 text-center py-12">{t('loading')}</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-600 text-center py-12">{t('noSessions')}</p>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-midnight font-semibold text-base">{s.title_en}</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.is_published ? 'text-green-700' : 'text-red-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${s.is_published ? 'bg-green-500' : 'bg-red-500'}`} />
                  {s.is_published ? t('sessionPublished') : t('unpublished')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('sessionDaysOfWeek')}</span>
                  {s.is_recurring ? (
                    <div className="flex gap-1">
                      {ALL_DAYS.map((d) => (
                        <span
                          key={d}
                          title={dayNames[d]}
                          className={`grid place-items-center w-6 h-6 rounded text-[10px] font-semibold ${
                            s.days_of_week.includes(d)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {dayNames[d].charAt(0).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium whitespace-nowrap">
                      {s.specific_date ? formatSessionDate(s.specific_date, locale) : '—'}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('sessionTime')}</span>
                  <span className="text-gray-800">{formatSessionTimeRange(s.start_time, s.end_time, locale)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('sessionCapacity')}</span>
                  <span className="text-gray-800">{s.capacity}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('sessionPrice')}</span>
                  <span className="text-gray-800">{s.price_cents === 0 ? t('free') : formatPrice(s.price_cents, s.currency, locale)}</span>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-3">
                <button
                  onClick={() => { setShowForm(false); setRoster(s) }}
                  className="text-blue-700 font-medium hover:underline text-xs"
                >
                  {t('sessionViewSignups')}
                </button>
                <button
                  onClick={() => { setRoster(null); setEditing(s); setShowForm(true) }}
                  className="text-midnight font-medium hover:underline text-xs"
                >
                  {t('editSession')}
                </button>
                <button
                  onClick={() => setDeleteTarget(s.id)}
                  className="text-red-600 hover:text-red-700 text-xs"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('confirmDeleteSession')}
        message={t('confirmDeleteSessionMessage')}
        confirmLabel={t('confirm')}
        destructive
        loading={deleting}
      />
    </div>
  )
}
