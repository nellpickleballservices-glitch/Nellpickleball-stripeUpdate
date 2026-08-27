'use client'

import dynamic from 'next/dynamic'

// Defer the entire chatbot bundle (ChatBubble + ChatPanel + Motion + chat hooks)
// until after first paint. SSR is off so the chat code is never in the initial
// server-rendered HTML or the first client chunk — it loads on hydration.
const ChatWidget = dynamic(
  () => import('./ChatWidget').then((mod) => ({ default: mod.ChatWidget })),
  { ssr: false, loading: () => null }
)

export function ChatWidgetLoader({ locale }: { locale: string }) {
  return <ChatWidget locale={locale} />
}
