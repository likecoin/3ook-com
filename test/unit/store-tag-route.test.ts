import { describe, expect, it } from 'vitest'

import { getStoreTagIdFromRoute } from '~/composables/use-store-tags'

describe('getStoreTagIdFromRoute', () => {
  it('reads the tag id from the route param', () => {
    expect(getStoreTagIdFromRoute({ params: { tagId: 'latest' }, query: {} })).toBe('latest')
  })

  it('falls back to the legacy ?tag= alias without a param', () => {
    expect(getStoreTagIdFromRoute({ params: {}, query: { tag: 'latest' } })).toBe('latest')
    expect(getStoreTagIdFromRoute({ params: {}, query: { tag: ['a', 'b'] } })).toBe('a')
  })

  it('prefers the param over the ?tag= alias', () => {
    expect(getStoreTagIdFromRoute({ params: { tagId: 'free' }, query: { tag: 'latest' } })).toBe('free')
  })

  it('returns an empty string without a param or alias', () => {
    expect(getStoreTagIdFromRoute({ params: {}, query: {} })).toBe('')
  })
})
