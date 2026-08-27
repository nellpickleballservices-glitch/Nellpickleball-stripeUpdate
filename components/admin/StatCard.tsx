import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: number
  icon?: ReactNode
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 shadow-sm flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-3xl font-bold text-midnight mt-2">
          {value.toLocaleString()}
        </p>
      </div>
      {icon && (
        <span className="text-gray-300 shrink-0">
          {icon}
        </span>
      )}
    </div>
  )
}
