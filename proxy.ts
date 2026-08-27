import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import {
  needsAuthCheck,
  isProtectedRoute,
  isAuthRedirectRoute,
  isCompleteProfileRoute,
} from '@/lib/middleware/route-helpers'
import {
  setMembershipCookie,
  getMembershipFromCookie,
} from '@/lib/middleware/cookie-signing'

const intlMiddleware = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // PUBLIC ROUTES: Only run i18n middleware, skip Supabase entirely.
  // This eliminates the getUser() roundtrip on /, /about, /learn, /events, /contact, /pricing, etc.
  if (!needsAuthCheck(pathname)) {
    return intlMiddleware(request)
  }

  // PROTECTED/AUTH ROUTES: Create Supabase client and check auth
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // CRITICAL: Always call getUser() — validates JWT with Supabase auth server.
  // Never use the session-based getter — it does not revalidate tokens (security vulnerability).
  const { data: { user } } = await supabase.auth.getUser()

  // AUTH REDIRECT ROUTES: Redirect logged-in users away from /login, /signup.
  // There is no member dashboard — booking lives on the public /sessions pages.
  if (isAuthRedirectRoute(pathname)) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    // Not logged in — show login/signup page with i18n + Supabase cookies
    const intlResponse = intlMiddleware(request)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return intlResponse
  }

  // PROTECTED ROUTES: Unauthenticated users go to /login
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ADMIN ROUTES: Non-admin users redirected to /
  if (user && pathname.includes('/n3ll-admin-x9k2')) {
    if (user.app_metadata?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // INCOMPLETE PROFILE: OAuth users without a country must complete their profile.
  // Skip this check if they're already on the complete-profile page.
  if (user && !isCompleteProfileRoute(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('country')
      .eq('id', user.id)
      .single()

    if (profile && profile.country === null) {
      const url = request.nextUrl.clone()
      url.pathname = '/signup/complete-profile'
      return NextResponse.redirect(url)
    }
  }

  // MEMBER ROUTES: Check membership status (with cookie cache)
  // LOCKED DECISION (CONTEXT.md): Authenticated but unsubscribed users accessing /member/* go to /pricing.
  //
  // Play-session booking is deliberately NOT gated here — it lives on the public
  // /sessions pages and is open to everyone, members and non-members alike.
  if (user && pathname.includes('/member/')) {
    // First: check signed cookie cache for membership status
    const cached = await getMembershipFromCookie(request)

    if (cached && cached.active) {
      // Cache hit — skip DB query, proceed to intl response
    } else if (cached === null) {
      // Cache miss or expired — query DB for membership status
      const { data: membership } = await supabase
        .from('memberships')
        .select('status, plan')
        .eq('user_id', user.id)
        .in('status', ['active'])
        .maybeSingle()

      if (!membership) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Active membership — cache in signed cookie for 5 minutes
      await setMembershipCookie(supabaseResponse, {
        active: true,
        planType: membership.plan ?? null,
        cachedAt: Date.now(),
      })
    } else {
      // cached.active is false — redirect to pricing
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Compose next-intl middleware after Supabase auth check.
  // Copy Supabase auth cookies (and membership cache cookie) into the intl response.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return intlResponse
}

export const config = {
  matcher: [
    '/((?!api|auth|_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|ogg)$).*)',
  ],
}
