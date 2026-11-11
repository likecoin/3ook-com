import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import queryMiddleware from '~/middleware/query.global'
import { useCarriedLinkTags } from '~/composables/use-carried-link-tags'

const { mockNavigateTo } = vi.hoisted(() => ({ mockNavigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => mockNavigateTo)

function createRoute(query: Record<string, string> = {}, path = '/store') {
  const search = new URLSearchParams(query).toString()
  const fullPath = search ? `${path}?${search}` : path
  return { path, fullPath, query, params: {} } as unknown as Parameters<typeof queryMiddleware>[0]
}

function runMiddleware(
  toQuery: Record<string, string>,
  fromQuery: Record<string, string>,
  { toPath = '/plus' } = {},
) {
  return queryMiddleware(createRoute(toQuery, toPath), createRoute(fromQuery))
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

  it('drops a superseded redirect instead of shadowing the next navigation', () => {
    // Armed by a redirect that never lands: the reader clicks a tagged link
    // before it resolves, and that click sets both tags itself.
    runMiddleware({}, { ll_medium: 'recommendation' }, { toPath: '/store/abc' })
    runMiddleware(
      { ll_medium: 'plus-cta', ll_source: 'bookstore' },
      { ll_medium: 'recommendation' },
      { toPath: '/plus' },
    )
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: false,
    })
  })

  it('drops a superseded redirect that armed the route the reader then opened', () => {
    // Same route as the redirect that never landed, but this link sets the tag
    // itself, so the abandoned pass must not mark it inherited.
    runMiddleware({}, { ll_medium: 'recommendation' }, { toPath: '/plus' })
    runMiddleware({ ll_medium: 'plus-cta' }, {}, { toPath: '/plus' })
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: false,
    })
  })

  it('leaves the latch disarmed when a redirect carries no link tags', () => {
    // A superseded redirect arms /plus, then the reader opens /plus from a link
    // that sets the tag itself, so that click inherits the abandoned mark.
    runMiddleware({}, { ll_medium: 'recommendation' }, { toPath: '/plus' })
    runMiddleware({ ll_medium: 'recommendation' }, { utm_source: 'newsletter' })
    // Its own redirect pass carries no tag, so it must be free to correct the mark.
    runMiddleware({ ll_medium: 'recommendation', utm_source: 'newsletter' }, { utm_source: 'newsletter' })
    expect(useCarriedLinkTags().value).toEqual({
      isLLMediumCarried: false,
      isLLSourceCarried: false,
    })
  })

  it('leaves a back or forward landing on its own query', () => {
    window.history.replaceState({ current: '/store/@publisher' }, '')
    try {
      runMiddleware({}, { ll_medium: 'search-result', from: '@publisher' }, { toPath: '/store/@publisher' })
    }
    finally {
      window.history.replaceState(null, '')
    }
    expect(mockNavigateTo).not.toHaveBeenCalled()
    expect(useCarriedLinkTags().value.isLLMediumCarried).toBe(false)
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
