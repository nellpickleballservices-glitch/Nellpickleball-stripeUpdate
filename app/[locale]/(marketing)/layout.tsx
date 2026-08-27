import { getLocale } from 'next-intl/server'
import { Footer } from '@/components/Footer'
import { ChatWidgetLoader } from '@/components/chatbot/ChatWidgetLoader'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()

  return (
    <>
      {children}
      <Footer />
      <ChatWidgetLoader locale={locale} />
    </>
  )
}
