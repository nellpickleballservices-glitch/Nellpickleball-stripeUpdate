import { describe, it, expect } from 'vitest'
import { compressImage } from '@/lib/image-compress'

/**
 * compressImage must NEVER reject an upload because of an unexpected condition.
 * The contract is: "make it smaller if you can; otherwise hand the original
 * back so the upload still succeeds." All branches return a File.
 */
describe('compressImage — graceful fallback contract', () => {
  it('returns original GIFs untouched (animation preserved)', async () => {
    const file = new File(['x'.repeat(300_000)], 'a.gif', { type: 'image/gif' })
    const out = await compressImage(file)
    expect(out).toBe(file)
  })

  it('returns original SVGs untouched (vector preserved)', async () => {
    const file = new File(['<svg></svg>'], 'a.svg', { type: 'image/svg+xml' })
    const out = await compressImage(file)
    expect(out).toBe(file)
  })

  it('returns original tiny files (no point compressing)', async () => {
    const file = new File(['x'.repeat(100)], 'tiny.png', { type: 'image/png' })
    const out = await compressImage(file)
    expect(out).toBe(file)
  })

  it('returns original when document is undefined (SSR / server context)', async () => {
    // vitest defaults to node env — document is undefined here, mimicking server.
    expect(typeof document).toBe('undefined')
    const file = new File(['x'.repeat(500_000)], 'big.png', { type: 'image/png' })
    const out = await compressImage(file)
    expect(out).toBe(file)
  })

  it('always resolves to a File (never throws)', async () => {
    const cases = [
      new File([''], 'empty.png', { type: 'image/png' }),
      new File(['garbage'], 'corrupt.jpg', { type: 'image/jpeg' }),
      new File(['x'.repeat(500_000)], 'big.png', { type: 'image/png' }),
    ]
    for (const f of cases) {
      const out = await compressImage(f)
      expect(out).toBeInstanceOf(File)
    }
  })
})
