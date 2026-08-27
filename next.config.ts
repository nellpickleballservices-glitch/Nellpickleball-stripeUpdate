import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        // Stopgap for pasted Google Images thumbnail URLs. These links are
        // unstable and will eventually break — re-upload to Supabase storage
        // for production-grade images.
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
    ],
  },
  async headers() {
    // Content-Security-Policy mitigates XSS by limiting which origins can
    // serve scripts/styles/images. 'unsafe-inline' is unfortunately required
    // for next/font + Tailwind's inlined critical CSS + next-intl's JSON-LD,
    // but inline scripts are still restricted by the strict-dynamic technique
    // wherever Next emits them via its bootstrap. Origins below cover Supabase,
    // YouTube, Google avatars/images, Vercel Analytics, OpenAI streaming.
    // ffmpeg.wasm (admin video compression) loads its Worker + core scripts
    // as blob URLs, and fetches the core package from unpkg. Allow both via
    // script-src/worker-src/connect-src.
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} blob: https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Allow any HTTPS image/media so admins can paste URLs from arbitrary
      // hosts (Imgur, Cloudinary, third-party CDNs, etc.) without each one
      // needing its own CSP entry. Public-page <img>/<video> tags only ever
      // point at our own URLs anyway, so the practical risk is small.
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in https://api.openai.com https://api.resend.com https://vitals.vercel-insights.com https://unpkg.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ]
  },
}

export default withNextIntl(config)
