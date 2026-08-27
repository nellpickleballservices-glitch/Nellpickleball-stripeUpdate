'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  getExpeditionInterestsAction,
  updateExpeditionInterestStatusAction,
  deleteExpeditionInterestAction,
} from '@/app/actions/admin'
import type { AdminExpeditionInterest, InterestStatus } from '@/app/actions/admin'

const STATUSES: InterestStatus[] = ['new', 'contacted', 'booked', 'declined']

const STATUS_STYLES: Record<InterestStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  booked: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-gray-100 text-gray-600 border-gray-300',
}

export default function AdminInterestsPage() {
  const t = useTranslations('Admin')
  const [items, setItems] = useState<AdminExpeditionInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | InterestStatus>('all')
  const [, startTransition] = useTransition()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getExpeditionInterestsAction()
      setItems(data)
    } catch (err) {
      console.error('Failed to load interests:', err)
    } finally {
      setLoading(false)
    }
  }

  function changeStatus(id: string, status: InterestStatus) {
    const prev = items
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
    startTransition(async () => {
      try {
        await updateExpeditionInterestStatusAction(id, status)
      } catch (err) {
        console.error('Failed to update status:', err)
        setItems(prev)
      }
    })
  }

  async function deleteItem(id: string) {
    if (!confirm(t('confirmDeleteInterest'))) return
    try {
      await deleteExpeditionInterestAction(id)
      setItems((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const counts = STATUSES.reduce<Record<InterestStatus, number>>(
    (acc, s) => ({ ...acc, [s]: items.filter((i) => i.status === s).length }),
    { new: 0, contacted: 0, booked: 0, declined: 0 }
  )

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-midnight">{t('expeditionInterests')}</h1>
        <span className="text-sm text-gray-500">{items.length} {t('totalLeads')}</span>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterPill
          label={t('allInterests')}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          count={items.length}
        />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            label={t(`interestStatus_${s}`)}
            active={filter === s}
            onClick={() => setFilter(s)}
            count={counts[s]}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-12">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('noInterests')}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((it) => (
            <li key={it.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    {it.expedition_title ?? '—'}
                  </p>
                  <h3 className="text-midnight font-semibold text-lg">{it.name}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <a href={`mailto:${it.email}`} className="hover:underline">{it.email}</a>
                    {it.phone && (
                      <>
                        {' · '}
                        <a href={`tel:${it.phone}`} className="hover:underline">{it.phone}</a>
                      </>
                    )}
                    {it.party_size && <> · {t('partySizeLabel')}: {it.party_size}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={it.status}
                    onChange={(e) => changeStatus(it.id, e.target.value as InterestStatus)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${STATUS_STYLES[it.status]} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`interestStatus_${s}`)}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteItem(it.id)}
                    className="text-xs text-red-600 hover:underline px-2"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
              {it.message && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 whitespace-pre-wrap">
                  {it.message}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                {new Date(it.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-midnight text-white border-midnight'
          : 'bg-white text-midnight border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`ml-1.5 ${active ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
    </button>
  )
}
