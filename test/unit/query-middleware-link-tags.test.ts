import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import queryMiddleware from '~/middleware/query.global'
import { useCarriedLinkTags } from '~/composables/use-carried-link-tags'

const { mockNavigateTo } = vi.hoisted(() => ({ mockNavigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => mockNavigateTo)

function createRoute(query: Record<string, string> = {}) {
  return { query, params: {} } as unknown as Parameters<typeof queryMiddleware>[0]
}

function runMiddleware(toQuery: Record<string, string>, fromQuery: Record<string, string>) {
  return queryMiddleware(createRoute(toQuery), createRoute(fromQuery))
}

describe('query.global carried link tags', () => {
  beforeEach(() => {
    mockNavigateTo.mockClear()
    useCarriedLinkTags().value = { isLLMediumCarried: false, isLLSourceCarried: false }
    // An untagged navigation also clears the redirect latch the middleware keeps.
    runMiddleware({}, {})
  })

  it('marks a tag the middleware copied forward', () => {
    runMiddleware({}, { ll_medium: 'recommendation', ll_source: '0xabc' })
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: true,
      isLLSourceCarried: true,
    })
    expect(mockNavigateTo).toHaveBeenCalledTimes(1)
  })

  it('leaves a tag the target route set itself unmarked', () => {
    runMiddleware({ ll_medium: 'search-result', ll_source: 'bookstore' }, { ll_medium: 'recommendation' })
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: false,
    })
  })

  it('marks each tag independently', () => {
    // Tag pills set only `ll_medium`, so the two can diverge.
    runMiddleware({ ll_medium: 'tag-latest' }, { ll_medium: 'recommendation', ll_source: '0xabc' })
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: true,
    })
  })

  it('survives the redirect pass that navigateTo triggers', () => {
    const from = { ll_medium: 'recommendation' }
    runMiddleware({}, from)
    expect(useCarriedLinkTags().value.isLLMediumCarried).toBe(true)
    // The rewritten route re-enters this middleware with the tag already on
    // `to`; clearing there would wipe the mark the first pass just set.
    runMiddleware({ ll_medium: 'recommendation' }, from)
    expect(useCarriedLinkTags().value.isLLMediumCarried).toBe(true)
  })

  it('clears the mark once a later navigation carries nothing', () => {
    runMiddleware({}, { ll_medium: 'recommendation' })
    runMiddleware({ ll_medium: 'recommendation' }, { ll_medium: 'recommendation' })
    runMiddleware({}, {})
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: false,
    })
  })
})
