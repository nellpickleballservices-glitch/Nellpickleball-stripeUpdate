import { describe, it, expect } from 'vitest'
import {
  isProtectedRoute,
  isAuthRedirectRoute,
  needsAuthCheck,
} from '@/lib/middleware/route-helpers'

describe('isProtectedRoute', () => {
  it('returns true for /member/dashboard', () => {
    expect(isProtectedRoute('/member/dashboard')).toBe(true)
  })

  it('returns true for /n3ll-admin-x9k2/users (obscured admin URL)', () => {
    expect(isProtectedRoute('/n3ll-admin-x9k2/users')).toBe(true)
  })

  it('returns false for /dashboard (no member dashboard route)', () => {
    expect(isProtectedRoute('/dashboard')).toBe(false)
  })

  it('returns true for locale-prefixed /en/member/dashboard', () => {
    expect(isProtectedRoute('/en/member/dashboard')).toBe(true)
  })

  it('returns false for /', () => {
    expect(isProtectedRoute('/')).toBe(false)
  })

  it('returns false for /about', () => {
    expect(isProtectedRoute('/about')).toBe(false)
  })

  it('returns false for /events', () => {
    expect(isProtectedRoute('/events')).toBe(false)
  })

  it('returns false for /pricing', () => {
    expect(isProtectedRoute('/pricing')).toBe(false)
  })
})

describe('isAuthRedirectRoute', () => {
  it('returns true for /login', () => {
    expect(isAuthRedirectRoute('/login')).toBe(true)
  })

  it('returns true for /signup', () => {
    expect(isAuthRedirectRoute('/signup')).toBe(true)
  })

  it('returns true for locale-prefixed /en/login', () => {
    expect(isAuthRedirectRoute('/en/login')).toBe(true)
  })

  it('returns false for /member/login (specificity check)', () => {
    expect(isAuthRedirectRoute('/member/login')).toBe(false)
  })
})

describe('needsAuthCheck', () => {
  it('returns true for protected routes', () => {
    // PROTECTED_PREFIXES = ['/member/', '/n3ll-admin-x9k2/']
    expect(needsAuthCheck('/member/dashboard')).toBe(true)
    expect(needsAuthCheck('/n3ll-admin-x9k2/users')).toBe(true)
  })

  it('returns true for auth redirect routes', () => {
    expect(needsAuthCheck('/login')).toBe(true)
    expect(needsAuthCheck('/signup')).toBe(true)
  })

  it('returns false for public routes', () => {
    expect(needsAuthCheck('/')).toBe(false)
    expect(needsAuthCheck('/about')).toBe(false)
    expect(needsAuthCheck('/events')).toBe(false)
    expect(needsAuthCheck('/contact')).toBe(false)
    expect(needsAuthCheck('/learn')).toBe(false)
    expect(needsAuthCheck('/pricing')).toBe(false)
  })
})

