'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { searchUsersAction } from '@/app/actions/admin'
import type { UserWithDetails } from '@/lib/types/admin'
import { UserSearchBar } from './UserSearchBar'
import { UserTable } from './UserTable'
import { UserSlideOut } from './UserSlideOut'

export default function UsersPage() {
  const t = useTranslations('Admin')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<UserWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async (searchQuery: string, searchPage: number) => {
    setLoading(true)
    try {
      const result = await searchUsersAction(searchQuery, searchPage)
      setUsers(result.users)
      setTotal(result.total)
    } catch {
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(query, page)
  }, [query, page, fetchUsers])

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setPage(1) // Reset to page 1 on new search
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId)
  }, [])

  const handleCloseSlideOut = useCallback(() => {
    setSelectedUserId(null)
    // Refresh the table to reflect any changes (e.g., disable/enable)
    fetchUsers(query, page)
  }, [query, page, fetchUsers])

  return (
    <div>
      <h1 className="text-2xl font-bold text-midnight mb-6">{t('users')}</h1>

      <div className="mb-6">
        <UserSearchBar onSearch={handleSearch} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <UserTable
            users={users}
            total={total}
            page={page}
            onPageChange={handlePageChange}
            onSelectUser={handleSelectUser}
          />
        )}
      </div>

      <UserSlideOut
        userId={selectedUserId}
        onClose={handleCloseSlideOut}
      />
    </div>
  )
}
