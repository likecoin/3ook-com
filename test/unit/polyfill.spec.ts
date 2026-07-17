import { describe, expect, it } from 'vitest'

import { findLast, findLastIndex, structuredCloneImpl } from '../../app/plugins/polyfill'

// The polyfill install blocks are guarded by `if (!nativeApi)`, so on a modern
// engine they no-op. To prove they behave correctly on a Chromium-91-class
// engine (where the natives are absent) we test the exported implementations
// directly, rather than deleting global prototype methods — which would corrupt
// the Vitest runtime that itself relies on them.
describe('findLast / findLastIndex polyfill (Chromium <97)', () => {
  it('finds the last matching element from the end', () => {
    const arr = [1, 2, 3, 4]
    expect(findLast(arr, n => n % 2 === 1)).toBe(3)
    expect(findLastIndex(arr, n => n % 2 === 1)).toBe(2)
  })

  it('returns undefined / -1 when nothing matches', () => {
    const arr = [1, 2, 3, 4]
    expect(findLast(arr, n => n > 9)).toBeUndefined()
    expect(findLastIndex(arr, n => n > 9)).toBe(-1)
  })

  it('passes value, index, array and honors thisArg', () => {
    const seen: Array<[number, number]> = []
    const ctx = { threshold: 2 }
    findLast([10, 20, 30], function (this: typeof ctx, value, index) {
      seen.push([value, index])
      return value < this.threshold
    }, ctx)
    // Iterates from the end: 30@2, 20@1, 10@0.
    expect(seen).toEqual([[30, 2], [20, 1], [10, 0]])
  })
})

describe('structuredClone polyfill (Chromium <98)', () => {
  it('deep-clones nested objects (not shared references)', () => {
    const src = { a: 1, nested: { b: 2 } }
    const clone = structuredCloneImpl(src)
    expect(clone).toEqual(src)
    expect(clone.nested).not.toBe(src.nested)
  })

  it('preserves structured types a JSON round-trip would lose', () => {
    const date = new Date('2026-07-18T00:00:00Z')
    const clonedDate = structuredCloneImpl(date)
    expect(clonedDate).toEqual(date)
    expect(clonedDate).not.toBe(date)

    const regex = structuredCloneImpl(/ab+c/gi)
    expect(regex.source).toBe('ab+c')
    expect(regex.flags).toBe('gi')

    const map = new Map([['k', { v: 1 }]])
    const clonedMap = structuredCloneImpl(map)
    expect(clonedMap.get('k')).toEqual({ v: 1 })
    expect(clonedMap.get('k')).not.toBe(map.get('k'))

    const set = new Set([1, 2, 3])
    expect(structuredCloneImpl(set)).toEqual(set)

    const bytes = new Uint8Array([1, 2, 3])
    const clonedBytes = structuredCloneImpl(bytes)
    expect(Array.from(clonedBytes)).toEqual([1, 2, 3])
    expect(clonedBytes.buffer).not.toBe(bytes.buffer)
  })

  it('handles shared and circular references without stack overflow', () => {
    const shared = { id: 1 }
    const src = { a: shared, b: shared }
    const clone = structuredCloneImpl(src)
    expect(clone.a).toBe(clone.b)

    const circular: Record<string, unknown> = { name: 'loop' }
    circular.self = circular
    const clonedCircular = structuredCloneImpl(circular)
    expect(clonedCircular.self).toBe(clonedCircular)
    expect(clonedCircular.name).toBe('loop')
  })

  it('returns primitives unchanged', () => {
    expect(structuredCloneImpl(42)).toBe(42)
    expect(structuredCloneImpl('str')).toBe('str')
    expect(structuredCloneImpl(null)).toBeNull()
    expect(structuredCloneImpl(undefined)).toBeUndefined()
  })
})
