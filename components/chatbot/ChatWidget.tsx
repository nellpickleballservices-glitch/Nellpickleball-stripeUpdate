'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChatBubble } from './ChatBubble'
import { ChatPanel } from './ChatPanel'

interface ChatWidgetProps {
  locale: string
}

const TOOLTIP_DELAY_MIN = 5000
const TOOLTIP_DELAY_MAX = 8000
const TOOLTIP_DURATION = 5000
const SESSION_FLAG = 'nell_chat_tooltip_shown'

export function ChatWidget({ locale }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const tooltipText =
    locale === 'es'
      ? 'Tienes preguntas? Pregunta a Nell!'
      : 'Have questions? Ask Nell!'

  // Auto-greeting tooltip (once per session)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_FLAG)) return

    const delay =
      TOOLTIP_DELAY_MIN +
      Math.random() * (TOOLTIP_DELAY_MAX - TOOLTIP_DELAY_MIN)

    const showTimer = setTimeout(() => {
      if (!isOpen) {
        setShowTooltip(true)
        sessionStorage.setItem(SESSION_FLAG, '1')
      }
    }, delay)

    return () => clearTimeout(showTimer)
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-hide tooltip after duration
  useEffect(() => {
    if (!showTooltip) return
    const timer = setTimeout(() => setShowTooltip(false), TOOLTIP_DURATION)
    return () => clearTimeout(timer)
  }, [showTooltip])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
    setShowTooltip(false)
  }, [])

  return (
    <>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && !isOpen && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed right-24 bottom-8 z-50 max-w-[200px] rounded-lg bg-[#1C305D] px-3 py-2 text-xs text-white shadow-lg"
          >
            {tooltipText}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 border-y-4 border-l-6 border-y-transparent border-l-[#1C305D]" />
          </m.div>
        )}
      </AnimatePresence>

      {/* Chat Panel — simple opacity fade, no slide. */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ChatPanel locale={locale} onClose={toggle} />
          </m.div>
        )}
      </AnimatePresence>

      {/* Bubble (always rendered) */}
      <ChatBubble onClick={toggle} isOpen={isOpen} />
    </>
  )
}
