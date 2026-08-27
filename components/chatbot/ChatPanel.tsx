'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  locale: string
  onClose: () => void
}

// ---------------------------------------------------------------------------
// i18n strings
// ---------------------------------------------------------------------------
const i18n = {
  en: {
    greeting:
      "Hi! I'm Nell, your NELL Pickleball Club assistant. How can I help you?",
    chip1: 'Membership plans',
    chip2: 'Court locations',
    chip3: 'How to play pickleball',
    chip4: 'Upcoming events',
    placeholder: 'Ask Nell...',
    unavailable: 'Nell is unavailable right now. Please try again later.',
  },
  es: {
    greeting:
      'Hola! Soy Nell, tu asistente de NELL Pickleball Club. Como puedo ayudarte?',
    chip1: 'Planes de membresia',
    chip2: 'Ubicaciones de canchas',
    chip3: 'Como jugar pickleball',
    chip4: 'Proximos eventos',
    placeholder: 'Pregunta a Nell...',
    unavailable: 'Nell no esta disponible en este momento. Intenta mas tarde.',
  },
} as const

function t(locale: string) {
  return locale === 'es' ? i18n.es : i18n.en
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ChatPanel({ locale, onClose }: ChatPanelProps) {
  const strings = t(locale)

  // Session ID (stable per component lifecycle)
  const sessionIdRef = useRef(uid())

  // Messages
  const [messages, setMessages] = useState<Message[]>([
    { id: 'greeting', role: 'assistant', content: strings.greeting },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [showChips, setShowChips] = useState(true)

  // Scroll container
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showTyping])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setShowChips(false)
      setInput('')
      setIsStreaming(true)
      setShowTyping(true)

      const userMsg: Message = { id: uid(), role: 'user', content: trimmed }
      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)

      // Prepare messages for API (last 10)
      const apiMessages = updatedMessages
        .filter((m) => m.id !== 'greeting')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const assistantId = uid()

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            locale,
            sessionId: sessionIdRef.current,
          }),
        })

        // Handle rate limit
        if (res.status === 429) {
          const data = await res.json()
          setShowTyping(false)
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: data.message },
          ])
          setIsStreaming(false)
          return
        }

        // Handle other errors
        if (!res.ok) {
          setShowTyping(false)
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: strings.unavailable },
          ])
          setIsStreaming(false)
          return
        }

        // Stream response
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No reader')

        const decoder = new TextDecoder()
        let assistantText = ''
        let firstToken = true

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                if (firstToken) {
                  setShowTyping(false)
                  firstToken = false
                }
                assistantText += parsed.text
                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantId)
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantText } : m,
                    )
                  }
                  return [
                    ...prev,
                    { id: assistantId, role: 'assistant', content: assistantText },
                  ]
                })
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      } catch {
        setShowTyping(false)
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: strings.unavailable },
        ])
      } finally {
        setShowTyping(false)
        setIsStreaming(false)
      }
    },
    [isStreaming, messages, locale, strings.unavailable],
  )

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Quick-reply chips
  const chips = [strings.chip1, strings.chip2, strings.chip3, strings.chip4]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  // Mobile: full-screen panel sized to the dynamic viewport (handles the iOS
  // address-bar show/hide), padded for the notch + home indicator, and locked
  // against rubber-band scrolling the page beneath.
  //
  // Desktop: ideal 480px tall, but capped to (viewport - 7rem) so the top edge
  // never floats above the viewport on shorter laptop screens. The bottom
  // anchor stays close to the chat bubble.
  const panelClasses = isMobile
    ? 'fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col bg-white overscroll-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
    : 'fixed right-6 bottom-20 z-50 flex h-[min(480px,calc(100dvh-7rem))] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'

  return (
    <div className={panelClasses}>
      {/* Header — denser on phones so it doesn't eat into the message area. */}
      <div className="flex shrink-0 items-center gap-3 bg-[#1C305D] px-4 py-2 sm:py-3">
        <img src="/images/icons/nellyBot1.png" alt="Nell" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover" />
        <span className="flex-1 text-sm font-semibold text-white">Nell</span>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-white/70 transition-colors hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages — min-h-0 lets the flex item shrink properly inside the
          column; tighter padding/spacing on phones so more bubbles fit. */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 space-y-2 sm:space-y-3 overflow-y-auto overscroll-contain bg-gray-50 px-3 py-3 sm:p-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <img src="/images/icons/nellyBot1.png" alt="Nell" className="mr-2 mt-1 h-6 w-6 flex-shrink-0 rounded-full object-cover" />
            )}
            <div
              className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 text-sm leading-snug sm:leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#A3FF12] text-[#1C305D]'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Quick-reply chips */}
        {showChips && (
          <div className="flex flex-wrap gap-2 pt-1">
            {chips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="rounded-full border border-[#A3FF12]/50 bg-white px-3 py-1.5 text-xs font-medium text-[#1C305D] transition-colors hover:border-[#38BDF8] hover:bg-[#38BDF8]/10"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1C305D]">
              <span className="text-[10px] font-bold text-[#A3FF12]">N</span>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-gray-200 px-4 py-3">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:0ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-500 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input — shrink-0 so it always stays visible above the keyboard. */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={strings.placeholder}
            disabled={isStreaming}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none transition-colors focus:border-[#A3FF12] disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A3FF12] text-[#1C305D] transition-all hover:scale-105 disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
