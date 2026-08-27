'use client'

import { useTranslations } from 'next-intl'

interface MembershipProps {
  membership: {
    plan_type: string
    status: string
    current_period_end: string
    stripe_customer_id: string
  }
  userName: string
}

const planDisplayName: Record<string, string> = {
  vip: 'VIP Nell-Picker',
  basic: 'Basic Nell-Picker',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  past_due: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function MembershipCard({ membership, userName }: MembershipProps) {
  const t = useTranslations('Billing')

  const planName = planDisplayName[membership.plan_type] || membership.plan_type
  const renewalDate = new Date(membership.current_period_end).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const statusKey = membership.status as keyof typeof statusColors
  const badgeClass = statusColors[statusKey] || statusColors.active

  const statusLabels: Record<string, string> = {
    active: t('statusActive'),
    past_due: t('statusPastDue'),
    cancelled: t('statusCancelled'),
  }

  return (
    <div className="bg-[#0f1d35] border border-gray-700 rounded-2xl p-6 max-w-md w-full">
      <h2 className="text-lg font-semibold text-white mb-4">{t('membershipCard')}</h2>

      {/* Past due warning banner */}
      {membership.status === 'past_due' && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-400 text-sm font-medium">{t('pastDueWarning')}</p>
        </div>
      )}

      {/* Plan and status */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-white/90 text-sm">{t('planLabel')}</span>
          <span className="text-white font-medium">{planName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-white/90 text-sm">{t('statusLabel')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
            {statusLabels[membership.status] || membership.status}
          </span>
        </div>
        {membership.status !== 'cancelled' && (
          <div className="flex justify-between items-center">
            <span className="text-white/90 text-sm">{t('renewalLabel')}</span>
            <span className="text-white text-sm">{renewalDate}</span>
          </div>
        )}
      </div>

      {/* Cancellation message */}
      {membership.status === 'cancelled' && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-red-300 text-sm">
            {t('cancelledMessage', { plan: planName, date: renewalDate })}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <button
        disabled
        className="w-full py-3 rounded-lg bg-[#BFFF00]/50 text-[#1C305D] font-semibold cursor-not-allowed"
      >
        {membership.status === 'cancelled' ? t('reactivateCta') : t('manageCta')}
      </button>
    </div>
  )
}
