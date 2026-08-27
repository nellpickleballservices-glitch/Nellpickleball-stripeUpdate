import { describe, it, expect } from 'vitest'

/**
 * Mirror of the validateUrl helper inside app/actions/admin/expeditions.ts.
 * Server actions can't be imported into vitest (they require 'use server'
 * runtime context) so the rule is replicated here as a pure function the
 * test can call directly. Any change to the action must update this too.
 */
function validateUrl(url: string): void {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('not http(s)')
  }
}

describe('validateUrl — only http(s) URLs are accepted', () => {
  it('accepts plain https URLs', () => {
    expect(() => validateUrl('https://supabase.co/storage/v1/object/foo.jpg')).not.toThrow()
  })
  it('accepts plain http URLs', () => {
    expect(() => validateUrl('http://example.com/img.png')).not.toThrow()
  })
  it('rejects javascript: URLs (XSS vector)', () => {
    expect(() => validateUrl('javascript:alert(1)')).toThrow()
    expect(() => validateUrl('JaVaScRiPt:alert(1)')).toThrow()
  })
  it('rejects data: URLs (smuggle HTML / scripts)', () => {
    expect(() => validateUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toThrow()
  })
  it('rejects file:// URLs', () => {
    expect(() => validateUrl('file:///etc/passwd')).toThrow()
  })
  it('rejects ftp:// URLs', () => {
    expect(() => validateUrl('ftp://example.com/foo')).toThrow()
  })
  it('rejects vbscript: URLs', () => {
    expect(() => validateUrl('vbscript:msgbox(1)')).toThrow()
  })
  it('rejects empty / malformed strings', () => {
    expect(() => validateUrl('')).toThrow()
    expect(() => validateUrl('not a url')).toThrow()
    expect(() => validateUrl('//no-scheme.com/foo')).toThrow()
  })
})

describe('Date format guard — server action rejects non-YYYY-MM-DD', () => {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  const valid = ['2026-01-01', '2026-12-31', '1999-06-15']
  const invalid = [
    '',
    'tomorrow',
    "2026-01-01' OR '1'='1",
    '2026/01/01',
    '2026-1-1',
    '01-01-2026',
    '2026-01-01T00:00:00',
    'javascript:alert(1)',
    '<script>alert(1)</script>',
  ]
  it.each(valid)('accepts %s', (d) => {
    expect(DATE_RE.test(d)).toBe(true)
  })
  it.each(invalid)('rejects %s', (d) => {
    expect(DATE_RE.test(d)).toBe(false)
  })
})

describe('Length cap helper — same semantics as checkLen in the action', () => {
  function checkLen(value: string | null | undefined, max: number, field: string): void {
    if (value && value.length > max) throw new Error(`${field} too long`)
  }
  it('passes null / undefined / empty string', () => {
    expect(() => checkLen(null, 100, 'x')).not.toThrow()
    expect(() => checkLen(undefined, 100, 'x')).not.toThrow()
    expect(() => checkLen('', 100, 'x')).not.toThrow()
  })
  it('passes values exactly at the limit', () => {
    expect(() => checkLen('a'.repeat(100), 100, 'x')).not.toThrow()
  })
  it('throws for values one character over the limit', () => {
    expect(() => checkLen('a'.repeat(101), 100, 'x')).toThrow()
  })
  it('throws for pathological mega-strings (DOS prevention)', () => {
    expect(() => checkLen('a'.repeat(1_000_000), 2000, 'x')).toThrow()
  })
})
