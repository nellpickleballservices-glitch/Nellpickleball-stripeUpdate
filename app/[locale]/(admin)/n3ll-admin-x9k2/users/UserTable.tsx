'use client'

import { useTranslations } from 'next-intl'
import type { UserWithDetails } from '@/lib/types/admin'

interface UserTableProps {
  users: UserWithDetails[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onSelectUser: (userId: string) => void
}

export function UserTable({ users, total, page, onPageChange, onSelectUser }: UserTableProps) {
  const t = useTranslations('Admin')
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-700 uppercase tracking-wider py-3 px-4">
                {t('userName')}
              </th>
              <th className="text-left text-xs font-medium text-gray-700 uppercase tracking-wider py-3 px-4">
                {t('userEmail')}
              </th>
              <th className="text-left text-xs font-medium text-gray-700 uppercase tracking-wider py-3 px-4">
                {t('userStatus')}
              </th>
              <th className="text-left text-xs font-medium text-gray-700 uppercase tracking-wider py-3 px-4">
                {t('joinedDate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-600 py-8">
                  {t('noResults')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-midnight font-medium text-sm">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="py-3 px-4 text-gray-700 text-sm">
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    {user.is_banned ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {t('userBanned')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {t('membershipActive')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 px-4 pb-4">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm text-gray-700 hover:text-midnight disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('previousPage')}
          </button>
          <span className="text-sm text-gray-600">
            {t('pageOf', { current: page, total: totalPages })}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm text-gray-700 hover:text-midnight disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t('nextPage')}
          </button>
        </div>
      )}
    </div>
  )
}
