'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  getSessionSignupsAction,
  updateSignupStatusAction,
  deleteSignupAction,
} from '@/app/actions/admin/sessions'
import { formatSessionDate, formatPrice, clubToday } from '@/lib/sessions'
import type { AdminSessionSignup, PaymentStatus, PlaySession } from '@/lib/types/sessions'

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
}

const STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled', 'refunded']

/** A sign-up counts against capacity only while pending-and-unexpired or paid. */
function occupiesSpot(s: AdminSessionSignup): boolean {
  if (s.payment_status === 'paid') return true
  if (s.payment_status !== 'pending') return false
  return !s.hold_expires_at || Date.parse(s.hold_expires_at) > Date.now()
}

export function SignupsPanel({ session, onClose }: { session: PlaySession; onClose: () => void }) {
  const t = useTranslations('Admin')
  const locale = useLocale()
  const [signups, setSignups] = useState<AdminSessionSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSignups(await getSessionSignupsAction(session.id))
    } catch (err) {
      console.error('Failed to load signups:', err)
    } finally {
      setLoading(false)
    }
  }, [session.id])

  useEffect(() => { load() }, [load])

  function changeStatus(id: string, status: PaymentStatus) {
    const prev = signups
    setSignups((rows) => rows.map((r) => (r.id === id ? { ...r, payment_status: status } : r)))
    startTransition(async () => {
      try {
        await updateSignupStatusAction(id, status)
      } catch (err) {
        console.error('Failed to update status:', err)
        setSignups(prev) // roll the optimistic update back
      }
    })
  }

  async function remove(id: string) {
    if (!confirm(t('confirmDeleteSignup'))) return
    try {
      await deleteSignupAction(id)
      setSignups((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete signup:', err)
    }
  }

  // Group by date so the admin sees one roster per game, newest games first.
  const grouped = useMemo(() => {
    const today = clubToday()
    const byDate = new Map<string, AdminSessionSignup[]>()
    for (const s of signups) {
      if (!showPast && s.session_date < today) continue
      const list = byDate.get(s.session_date) ?? []
      list.push(s)
      byDate.set(s.session_date, list)
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [signups, showPast])

  const cashOwed = signups.filter(
    (s) => s.payment_method === 'cash' && s.payment_status === 'pending' && s.session_date >= clubToday()
  ).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-midnight">{session.title_en}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('sessionRosterSubtitle', { capacity: session.capacity })}
            {cashOwed > 0 && (
              <span className="ml-2 text-amber-700 font-medium">
                · {t('sessionCashOwed', { count: cashOwed })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {t('sessionShowPast')}
          </label>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">
            {t('close')}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">{t('loading')}</p>
      ) : grouped.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('sessionNoSignups')}</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, rows]) => {
            const taken = rows.filter(occupiesSpot).length
            return (
              <div key={date}>
                <div className="flex items-baseline justify-between border-b border-gray-200 pb-2 mb-2">
                  <h3 className="text-sm font-semibold text-midnight">
                    {formatSessionDate(date, locale)}
                  </h3>
                  <span className={`text-xs font-medium ${taken >= session.capacity ? 'text-red-600' : 'text-gray-500'}`}>
                    {taken}/{session.capacity} {taken >= session.capacity ? `· ${t('sessionSoldOut')}` : ''}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {rows.map((s) => (
                    <li key={s.id} className="py-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-midnight font-medium">
                          {s.name}
                          {!occupiesSpot(s) && (
                            <span className="ml-2 text-[11px] text-gray-400">({t('sessionSpotReleased')})</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                          {s.phone && <> · <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a></>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] px-2 py-1 rounded-full border ${
                          s.payment_method === 'cash'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {s.payment_method === 'cash' ? t('sessionPayCash') : t('sessionPayOnline')}
                          {' · '}
                          {formatPrice(s.amount_cents, s.currency, locale)}
                        </span>
                        <select
                          value={s.payment_status}
                          onChange={(e) => changeStatus(s.id, e.target.value as PaymentStatus)}
                          className={`text-xs font-medium px-2 py-1.5 rounded-full border ${STATUS_STYLES[s.payment_status]} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st}>{t(`signupStatus_${st}`)}</option>
                          ))}
                        </select>
                        <button onClick={() => remove(s.id)} className="text-xs text-red-600 hover:underline px-1">
                          {t('delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
