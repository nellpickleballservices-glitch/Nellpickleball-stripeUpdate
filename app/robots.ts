import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nellpickleball.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/n3ll-admin-x9k2/',
          '/en/n3ll-admin-x9k2/',
          '/auth/',
          '/api/',
          '/signup/complete-profile',
          '/en/signup/complete-profile',
          '/login',
          '/en/login',
          '/signup',
          '/en/signup',
          '/reset-password',
          '/en/reset-password',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
