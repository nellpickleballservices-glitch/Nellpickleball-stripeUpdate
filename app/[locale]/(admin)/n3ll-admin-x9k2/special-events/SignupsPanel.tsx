'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  getSpecialEventSignupsAction,
  updateSpecialEventSignupStatusAction,
  deleteSpecialEventSignupAction,
} from '@/app/actions/admin/special-events'
import { formatPrice } from '@/lib/sessions'
import type { AdminSpecialEventSignup, PaymentStatus, SpecialEvent } from '@/lib/types/special-events'

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
}

const STATUSES: PaymentStatus[] = ['pending', 'paid', 'cancelled', 'refunded']

function occupiesSpot(s: AdminSpecialEventSignup): boolean {
  if (s.payment_status === 'paid') return true
  if (s.payment_status !== 'pending') return false
  return !s.hold_expires_at || Date.parse(s.hold_expires_at) > Date.now()
}

export function SpecialEventSignupsPanel({ event, onClose }: { event: SpecialEvent; onClose: () => void }) {
  const t = useTranslations('Admin')
  const locale = useLocale()
  const [signups, setSignups] = useState<AdminSpecialEventSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSignups(await getSpecialEventSignupsAction(event.id))
    } catch (err) {
      console.error('Failed to load signups:', err)
    } finally {
      setLoading(false)
    }
  }, [event.id])

  useEffect(() => { load() }, [load])

  function changeStatus(id: string, status: PaymentStatus) {
    const prev = signups
    setSignups((rows) => rows.map((r) => (r.id === id ? { ...r, payment_status: status } : r)))
    startTransition(async () => {
      try {
        await updateSpecialEventSignupStatusAction(id, status)
      } catch (err) {
        console.error('Failed to update status:', err)
        setSignups(prev)
      }
    })
  }

  async function remove(id: string) {
    if (!confirm(t('confirmDeleteSignup'))) return
    try {
      await deleteSpecialEventSignupAction(id)
      setSignups((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      console.error('Failed to delete signup:', err)
    }
  }

  const taken = useMemo(() => signups.filter(occupiesSpot).length, [signups])

  const cashOwed = signups.filter(
    (s) => s.payment_method === 'cash' && s.payment_status === 'pending'
  ).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-midnight">{event.title_en}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('sessionRosterSubtitle', { capacity: event.capacity })}
            <span className={`ml-2 font-medium ${taken >= event.capacity ? 'text-red-600' : 'text-gray-600'}`}>
              · {taken}/{event.capacity} {t('seSignedUp')}
            </span>
            {cashOwed > 0 && (
              <span className="ml-2 text-amber-700 font-medium">
                · {t('sessionCashOwed', { count: cashOwed })}
              </span>
            )}
          </p>
        </div>
        <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">
          {t('close')}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">{t('loading')}</p>
      ) : signups.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('sessionNoSignups')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {signups.map((s) => (
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
      )}
    </div>
  )
}
