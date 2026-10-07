import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import fromQueryMiddleware from '~/middleware/from-query.global'
import { sanitizeFrom, splitGluedFromQuery } from '~~/shared/utils/liker-id'

const { mockNavigateTo } = vi.hoisted(() => ({ mockNavigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => mockNavigateTo)

function runMiddleware(query: Record<string, string>) {
  const route = { path: '/store/0xabc', query, params: {} } as unknown as Parameters<typeof fromQueryMiddleware>[0]
  return fromQueryMiddleware(route, route)
}

describe('splitGluedFromQuery', () => {
  it('splits a `?`-glued tail into its own params', () => {
    expect(splitGluedFromQuery('@poonworks?fbclid=abc&utm_source=fb')).toEqual({
      from: '@poonworks',
      gluedQuery: { fbclid: 'abc', utm_source: 'fb' },
    })
  })

  it('leaves a clean value alone', () => {
    expect(splitGluedFromQuery('@poonworks')).toEqual({ from: '@poonworks', gluedQuery: {} })
  })
})

describe('sanitizeFrom', () => {
  it('keeps a valid handle', () => {
    expect(sanitizeFrom('@poonworks')).toBe('@poonworks')
  })

  it('strips a glued-on query', () => {
    expect(sanitizeFrom('@poonworks?fbclid=IwVERDUAU')).toBe('@poonworks')
    expect(sanitizeFrom('@poonworks&utm_source=fb')).toBe('@poonworks')
  })

  it('canonicalizes the handle', () => {
    expect(sanitizeFrom('@PoonWorks')).toBe('@poonworks')
  })

  it('drops an invalid handle', () => {
    expect(sanitizeFrom('@ab')).toBeUndefined()
    expect(sanitizeFrom('@poon works')).toBeUndefined()
    expect(sanitizeFrom('@')).toBeUndefined()
  })

  it('keeps a legacy channel string', () => {
    expect(sanitizeFrom('liker_land')).toBe('liker_land')
    expect(sanitizeFrom('liker_land?fbclid=abc')).toBe('liker_land')
  })

  it('returns undefined for empty input', () => {
    expect(sanitizeFrom(undefined)).toBeUndefined()
    expect(sanitizeFrom('')).toBeUndefined()
    expect(sanitizeFrom('?fbclid=abc')).toBeUndefined()
  })
})

describe('from-query.global', () => {
  beforeEach(() => {
    mockNavigateTo.mockClear()
  })

  it('does nothing for a clean `from`', () => {
    runMiddleware({ from: '@poonworks', fbclid: 'abc' })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('does nothing without `from`', () => {
    runMiddleware({ fbclid: 'abc' })
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('restores a glued-on fbclid as its own param', () => {
    runMiddleware({ from: '@poonworks?fbclid=abc', utm_source: 'share' })
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { from: '@poonworks', fbclid: 'abc', utm_source: 'share' },
      }),
      { replace: true },
    )
  })

  it('keeps an existing param over a glued-on one', () => {
    runMiddleware({ from: '@poonworks?fbclid=glued', fbclid: 'real' })
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ query: { from: '@poonworks', fbclid: 'real' } }),
      { replace: true },
    )
  })

  it('drops an invalid handle but keeps the recovered params', () => {
    runMiddleware({ from: '@ab?fbclid=abc' })
    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({ query: { fbclid: 'abc' } }),
      { replace: true },
    )
  })
})
