import { describe, it, expect } from 'vitest'
import { parseBlocks, createBlock } from '@/lib/types/expedition-blocks'

describe('parseBlocks — must NEVER throw, even on hostile or garbage input', () => {
  it('returns empty array for null', () => {
    expect(parseBlocks(null)).toEqual([])
  })
  it('returns empty array for undefined', () => {
    expect(parseBlocks(undefined)).toEqual([])
  })
  it('returns empty array for empty string', () => {
    expect(parseBlocks('')).toEqual([])
  })
  it('returns empty array for non-JSON garbage', () => {
    expect(parseBlocks('not json at all')).toEqual([])
  })
  it('returns empty array for a JSON value that is not an array', () => {
    expect(parseBlocks('{"type":"heading"}')).toEqual([])
    expect(parseBlocks('"string"')).toEqual([])
    expect(parseBlocks('42')).toEqual([])
  })
  it('returns empty array for legacy HTML strings (graceful migration)', () => {
    expect(parseBlocks('<h1>hello</h1>')).toEqual([])
  })
  it('returns parsed array for valid JSON array of blocks', () => {
    const json = JSON.stringify([{ id: 'a', type: 'paragraph', text: 'hi' }])
    expect(parseBlocks(json)).toEqual([{ id: 'a', type: 'paragraph', text: 'hi' }])
  })
  it('does not throw on deeply nested or pathological JSON', () => {
    expect(() => parseBlocks('[' + '[]'.repeat(1000) + ']')).not.toThrow()
  })
})

describe('createBlock factory — produces well-formed blocks for every type', () => {
  it('heading defaults to level 2 with empty text', () => {
    const b = createBlock('heading')
    expect(b.type).toBe('heading')
    expect(b.id).toBeTruthy()
    if (b.type === 'heading') {
      expect(b.level).toBe(2)
      expect(b.text).toBe('')
    }
  })
  it('paragraph has empty text', () => {
    const b = createBlock('paragraph')
    expect(b.type).toBe('paragraph')
    if (b.type === 'paragraph') expect(b.text).toBe('')
  })
  it('image has empty url + caption', () => {
    const b = createBlock('image')
    if (b.type === 'image') {
      expect(b.url).toBe('')
      expect(b.caption).toBe('')
    }
  })
  it('image_text defaults to left side', () => {
    const b = createBlock('image_text')
    if (b.type === 'image_text') expect(b.side).toBe('left')
  })
  it('gallery defaults to 3 columns with no images', () => {
    const b = createBlock('gallery')
    if (b.type === 'gallery') {
      expect(b.columns).toBe(3)
      expect(b.images).toEqual([])
    }
  })
  it('link defaults to button style + newTab true', () => {
    const b = createBlock('link')
    if (b.type === 'link') {
      expect(b.style).toBe('button')
      expect(b.newTab).toBe(true)
    }
  })
  it('divider has no extra fields', () => {
    const b = createBlock('divider')
    expect(b.type).toBe('divider')
    expect(b.id).toBeTruthy()
  })
  it('every block gets a unique id', () => {
    const ids = new Set([
      createBlock('heading').id,
      createBlock('heading').id,
      createBlock('heading').id,
      createBlock('heading').id,
    ])
    expect(ids.size).toBe(4)
  })
})
