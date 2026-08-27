'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ExpeditionForm } from './ExpeditionForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  getExpeditionsAction,
  createExpeditionAction,
  updateExpeditionAction,
  deleteExpeditionAction,
} from '@/app/actions/admin'
import type { Expedition } from '@/lib/types/admin'

export default function AdminExpeditionsPage() {
  const t = useTranslations('Admin')
  const [expeditions, setExpeditions] = useState<Expedition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpedition, setEditingExpedition] = useState<Expedition | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getExpeditionsAction()
      setExpeditions(data)
    } catch (err) {
      console.error('Failed to load expeditions:', err)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleCreate(formData: FormData) {
    await createExpeditionAction(formData)
    setShowForm(false)
    showFeedback(t('expeditionCreated'))
    await load()
  }

  async function handleUpdate(formData: FormData) {
    if (!editingExpedition) return
    await updateExpeditionAction(editingExpedition.id, formData)
    setEditingExpedition(undefined)
    setShowForm(false)
    showFeedback(t('expeditionUpdated'))
    await load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExpeditionAction(deleteTarget)
      setDeleteTarget(null)
      showFeedback(t('expeditionDeleted'))
      await load()
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(expedition: Expedition) {
    setEditingExpedition(expedition)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingExpedition(undefined)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-midnight">{t('expeditions')}</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            {t('addExpedition')}
          </button>
        )}
      </div>

      {feedback && (
        <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
          {feedback}
        </div>
      )}

      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <ExpeditionForm
            expedition={editingExpedition}
            onSubmit={editingExpedition ? handleUpdate : handleCreate}
            onCancel={closeForm}
          />
        </div>
      ) : expeditions.length === 0 ? (
        <p className="text-gray-600 text-center py-12">{t('noExpeditions')}</p>
      ) : (
        <div className="grid gap-4">
          {expeditions.map((exp) => (
            <div key={exp.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <div className="flex items-start gap-4 mb-3">
                <img
                  src={exp.image_url}
                  alt={exp.title_en}
                  className="w-20 h-14 object-cover rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-midnight font-semibold text-base truncate">{exp.title_en}</h3>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ml-2 ${exp.is_published ? 'text-green-700' : 'text-red-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${exp.is_published ? 'bg-green-500' : 'bg-red-500'}`} />
                      {exp.is_published ? t('expeditionPublished') : t('unpublished')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('expeditionStartDate')}</span>
                  <span className="text-gray-800">{formatDate(exp.start_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('expeditionEndDate')}</span>
                  <span className="text-gray-800">{formatDate(exp.end_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">{t('expeditionExpirationDate')}</span>
                  <span className="text-gray-800">{exp.expires_at ? formatDate(exp.expires_at) : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block mb-0.5">Sort</span>
                  <span className="text-gray-800">{exp.sort_order}</span>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 pt-3">
                <button onClick={() => openEdit(exp)} className="text-midnight font-medium hover:underline text-xs">
                  {t('editExpedition')}
                </button>
                <button onClick={() => setDeleteTarget(exp.id)} className="text-red-600 hover:text-red-700 text-xs">
                  {t('deleteExpedition')}
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
        title={t('confirmDeleteExpedition')}
        message={t('confirmDeleteExpeditionMessage')}
        confirmLabel={t('confirm')}
        destructive
        loading={deleting}
      />
    </div>
  )
}
