'use client'

import { useEffect, useState } from 'react'

interface ChatBubbleProps {
  onClick: () => void
  isOpen: boolean
}

export function ChatBubble({ onClick, isOpen }: ChatBubbleProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat with Nell'}
      style={{
        right: 'max(1.5rem, env(safe-area-inset-right))',
        bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
      className={`fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
        isOpen
          ? 'hidden lg:flex bg-gray-700 hover:bg-gray-800'
          : 'bg-[#A3FF12] hover:scale-110 hover:bg-[#7ED957]'
      } ${mounted ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
    >
      {isOpen ? (
        /* X close icon */
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        /* Nell bot image as background — shifted down to show face + upper body */
        <div
          className="w-full h-full rounded-full"
          style={{
            backgroundImage: 'url(/images/icons/nellyBot1.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 60%',
          }}
        />
      )}
    </button>
  )
}
