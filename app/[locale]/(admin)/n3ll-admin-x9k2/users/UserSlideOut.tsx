'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { getUserDetailsAction, disableUserAction, enableUserAction, triggerPasswordResetAction, updateUserCountryAction } from '@/app/actions/admin'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { countryByCode } from '@/lib/data/countries'
import { CountrySelect } from '@/components/CountrySelect'
import { formatSessionDate, formatSessionTime } from '@/lib/sessions'
import type { PaymentStatus } from '@/lib/types/sessions'

interface UserSlideOutProps {
  userId: string | null
  onClose: () => void
}

type UserDetails = Awaited<ReturnType<typeof getUserDetailsAction>>

const SIGNUP_STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
}

export function UserSlideOut({ userId, onClose }: UserSlideOutProps) {
  const t = useTranslations('Admin')
  const locale = useLocale()
  const [details, setDetails] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [editingCountry, setEditingCountry] = useState(false)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'disable' | 'enable' | 'reset' | null>(null)

  const fetchDetails = useCallback(async (id: string) => {
    setLoading(true)
    setMessage(null)
    try {
      const data = await getUserDetailsAction(id)
      setDetails(data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load user details' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (userId) {
      fetchDetails(userId)
    } else {
      setDetails(null)
    }
  }, [userId, fetchDetails])

  const handleConfirmAction = async () => {
    if (!userId || !confirmAction) return
    setActionLoading(true)
    setMessage(null)

    try {
      if (confirmAction === 'disable') {
        await disableUserAction(userId)
        setMessage({ type: 'success', text: t('userDisabled') })
      } else if (confirmAction === 'enable') {
        await enableUserAction(userId)
        setMessage({ type: 'success', text: t('userEnabled') })
      } else if (confirmAction === 'reset') {
        await triggerPasswordResetAction(userId)
        setMessage({ type: 'success', text: t('resetSent') })
      }
      // Refresh details
      await fetchDetails(userId)
    } catch {
      setMessage({ type: 'error', text: 'Action failed. Please try again.' })
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
      setConfirmAction(null)
    }
  }

  const openConfirm = (action: 'disable' | 'enable' | 'reset') => {
    setConfirmAction(action)
    setConfirmOpen(true)
  }

  const confirmTitle = confirmAction === 'disable'
    ? t('confirmDisableTitle')
    : confirmAction === 'enable'
    ? t('confirmEnableTitle')
    : t('confirmResetTitle')

  const confirmMessage = confirmAction === 'disable'
    ? t('confirmDisableMessage')
    : confirmAction === 'enable'
    ? t('confirmEnableMessage')
    : t('confirmResetMessage')

  return (
    <>
      {/* Backdrop */}
      {userId && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto transition-transform duration-300 ease-in-out ${
          userId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-midnight transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-32 bg-gray-200 rounded mt-6" />
            </div>
          ) : details ? (
            <>
              {/* Profile Section */}
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium mb-3">
                  {t('profile')}
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {details.first_name.charAt(0)}{details.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-midnight font-semibold">
                      {details.first_name} {details.last_name}
                    </p>
                    <p className="text-gray-600 text-sm">{details.email}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {details.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('userPhone')}</span>
                      <span className="text-midnight">{details.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">{t('userCountry')}</span>
                    {editingCountry ? (
                      <div className="w-48">
                        <CountrySelect
                          name="country"
                          label=""
                          locale="en"
                          defaultValue={details.country ?? 'DO'}
                          onChange={async (code) => {
                            try {
                              await updateUserCountryAction(userId!, code)
                              setEditingCountry(false)
                              await fetchDetails(userId!)
                            } catch {
                              setMessage({ type: 'error', text: 'Failed to update country' })
                              setEditingCountry(false)
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-midnight">
                          {details.country
                            ? `${countryByCode.get(details.country)?.flag ?? ''} ${countryByCode.get(details.country)?.nameEn ?? details.country}`
                            : 'N/A'}
                        </span>
                        <button
                          onClick={() => setEditingCountry(true)}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          {t('edit')}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('joinedDate')}</span>
                    <span className="text-midnight">
                      {new Date(details.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {details.is_banned && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {t('userBanned')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Membership Section */}
              <div className="mb-6 pt-4 border-t border-gray-200">
                <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium mb-3">
                  {t('membership')}
                </h3>
                {details.membership ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('userPlan')}</span>
                      <span className="text-midnight capitalize">{details.membership.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('userStatus')}</span>
                      <span className={`text-sm font-medium ${
                        details.membership.status === 'active' ? 'text-green-700' :
                        details.membership.status === 'past_due' ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {details.membership.status === 'active' ? t('membershipActive') :
                         details.membership.status === 'past_due' ? t('membershipPastDue') :
                         t('membershipCancelled')}
                      </span>
                    </div>
                    {details.membership.current_period_end && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Period End</span>
                        <span className="text-midnight">
                          {new Date(details.membership.current_period_end).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('noMembership')}</p>
                )}
              </div>

              {/* Session sign-up history */}
              <div className="mb-6 pt-4 border-t border-gray-200">
                <h3 className="text-xs uppercase tracking-wider text-gray-600 font-medium mb-3">
                  {t('signupHistory')}
                </h3>
                {details.signups.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('noSignupsUser')}</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {details.signups.map((signup) => {
                      const title = locale === 'es' ? signup.title_es : signup.title_en
                      return (
                        <div
                          key={signup.id}
                          className="flex items-center justify-between gap-3 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-midnight truncate">{title ?? '—'}</p>
                            <p className="text-gray-600 text-xs">
                              {formatSessionDate(signup.session_date, locale)}
                              {signup.start_time && ` · ${formatSessionTime(signup.start_time, locale)}`}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${SIGNUP_STATUS_STYLES[signup.payment_status]}`}>
                            {t(`signupStatus_${signup.payment_status}`)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                {details.is_banned ? (
                  <button
                    onClick={() => openConfirm('enable')}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    {t('enableAccount')}
                  </button>
                ) : (
                  <button
                    onClick={() => openConfirm('disable')}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    {t('disableAccount')}
                  </button>
                )}
                <button
                  onClick={() => openConfirm('reset')}
                  className="w-full px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-midnight border border-gray-200 transition-colors"
                >
                  {t('triggerReset')}
                </button>
              </div>

              {/* Status message */}
              {message && (
                <div className={`mt-4 px-3 py-2 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null) }}
        onConfirm={handleConfirmAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={t('confirm')}
        destructive={confirmAction === 'disable'}
        loading={actionLoading}
      />
    </>
  )
}
