const PROTECTED_PREFIXES = ['/member/', '/n3ll-admin-x9k2/']
const AUTH_REDIRECT_ROUTES = ['/login', '/signup']
const COMPLETE_PROFILE_PATH = '/signup/complete-profile'

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(prefix => pathname.includes(prefix))
}

export function isAuthRedirectRoute(pathname: string): boolean {
  // Match /login, /signup, /en/login, /en/signup — but NOT /member/login
  // Strip optional locale prefix to get the effective path
  const localePattern = /^\/[a-z]{2}(?=\/|$)/
  const stripped = pathname.replace(localePattern, '') || '/'
  return AUTH_REDIRECT_ROUTES.includes(stripped)
}

export function needsAuthCheck(pathname: string): boolean {
  return isProtectedRoute(pathname) || isAuthRedirectRoute(pathname) || isCompleteProfileRoute(pathname)
}

export function isCompleteProfileRoute(pathname: string): boolean {
  const localePattern = /^\/[a-z]{2}(?=\/|$)/
  const stripped = pathname.replace(localePattern, '') || '/'
  return stripped === COMPLETE_PROFILE_PATH
}
