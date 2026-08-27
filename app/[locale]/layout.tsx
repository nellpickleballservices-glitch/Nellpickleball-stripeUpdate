import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Poppins, Bungee } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Navbar } from '@/components/Navbar'
import { MotionProvider } from '@/components/motion/MotionProvider'
import '../globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

const bungee = Bungee({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bungee',
  display: 'swap',
})


const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NELL Pickleball Club | Bavaro, Dominican Republic',
    template: '%s | NELL Pickleball Club',
  },
  description: 'Premier pickleball club in Bavaro, Dominican Republic. Join our community for courts, events, tournaments, and training sessions.',
  keywords: ['pickleball', 'pickleball club', 'Bavaro', 'Dominican Republic', 'Punta Cana', 'pickleball courts', 'pickleball lessons', 'pickleball tournaments'],
  icons: {
    icon: '/images/siteImages/favicon/nell_favicon.png',
    apple: '/images/siteImages/favicon/nell_favicon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'NELL Pickleball Club',
    title: 'NELL Pickleball Club | Bavaro, Dominican Republic',
    description: 'Premier pickleball club in Bavaro, Dominican Republic. Courts, events, tournaments, and training.',
    images: [
      {
        url: '/images/siteImages/players_in_action.jpeg',
        width: 1200,
        height: 630,
        alt: 'NELL Pickleball Club - Players in action',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NELL Pickleball Club | Bavaro, Dominican Republic',
    description: 'Premier pickleball club in Bavaro, Dominican Republic.',
    images: ['/images/siteImages/players_in_action.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  verification: {},
}

// Drives the mobile-browser chrome color, makes safe-area-inset env() vars
// available (viewportFit: 'cover'), and locks zoom + width.
export const viewport: Viewport = {
  themeColor: '#1C305D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${bebasNeue.variable} ${poppins.variable} ${bungee.variable}`}>
      <body className="font-poppins">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SportsActivityLocation',
              name: 'NELL Pickleball Club',
              description: 'Premier pickleball club in Bavaro, Dominican Republic.',
              url: siteUrl,
              logo: `${siteUrl}/images/icons/NellLogo.png`,
              image: `${siteUrl}/images/siteImages/players_in_action.jpeg`,
              sport: 'Pickleball',
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Bavaro',
                addressRegion: 'La Altagracia',
                addressCountry: 'DO',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 18.6872,
                longitude: -68.4543,
              },
              telephone: '+18296554777',
              email: 'nellpickleballclub@gmail.com',
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                opens: '07:00',
                closes: '22:00',
              },
              priceRange: '$$',
              sameAs: [
                'https://www.instagram.com/nellpickleballclub/',
                'https://www.facebook.com/nell.pickleball.club',
                'https://www.tiktok.com/@nell.pickleball.c',
              ],
            }),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <MotionProvider>
            <Navbar />
            {children}
          </MotionProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
