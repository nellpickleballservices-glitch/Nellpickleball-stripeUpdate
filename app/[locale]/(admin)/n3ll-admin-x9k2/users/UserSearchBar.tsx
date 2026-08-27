'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface UserSearchBarProps {
  onSearch: (query: string) => void
}

export function UserSearchBar({ onSearch }: UserSearchBarProps) {
  const t = useTranslations('Admin')
  const [value, setValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, 300)

    return () => clearTimeout(timer)
  }, [value, onSearch])

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
      />
    </div>
  )
}
