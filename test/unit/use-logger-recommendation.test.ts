import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useLogRecommendBookClick, useLogRecommendBooksView } from '~/composables/use-logger'

const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }))

mockNuxtImport('useScriptGoogleAnalytics', () => () => ({ proxy: { gtag: vi.fn() } }))
mockNuxtImport('useScriptMetaPixel', () => () => ({ proxy: { fbq: vi.fn() } }))
mockNuxtImport('useScriptPostHog', () => () => ({ proxy: { posthog: { capture: mockCapture } } }))

function getCapturedProperties() {
  expect(mockCapture).toHaveBeenCalledTimes(1)
  return mockCapture.mock.calls[0]![1] as Record<string, unknown>
}

beforeEach(() => {
  mockCapture.mockClear()
})

describe('recommendation impression and click properties', () => {
  // An editorial-only feed's id is `''`. `||` dropped it from both halves of
  // the join, leaving those clicks with no impression to divide by.
  it('keeps an editorial feed id on the impression', () => {
    useLogRecommendBooksView({
      eventName: 'recommend_books_view',
      llSource: '0xabc',
      isPersonalized: false,
      bookCount: 14,
      visibleCount: 12,
      feedId: '',
      nftClassIds: ['0x1', '0x2'],
    })
    const properties = getCapturedProperties()
    expect(properties.feed_id).toBe('')
    expect(properties.book_count).toBe(14)
    expect(properties.visible_count).toBe(12)
    expect(properties.ll_source).toBe('0xabc')
  })

  it('keeps an editorial feed id on the click', () => {
    useLogRecommendBookClick({
      nftClassId: '0xABC',
      isPersonalized: false,
      llMedium: 'recommendation',
      llSource: '0xdef',
      rank: 3,
      feedId: '',
    })
    const properties = getCapturedProperties()
    expect(properties.feed_id).toBe('')
    expect(properties.rank).toBe(3)
    // The impression normalizes its ids, and the join is an exact match.
    expect(properties.nft_class_id).toBe('0xabc')
    expect(properties.ll_source).toBe('0xdef')
  })

  it('omits a feed id that was never set', () => {
    useLogRecommendBookClick({
      nftClassId: '0xabc',
      isPersonalized: true,
      feedId: undefined,
    })
    expect(getCapturedProperties().feed_id).toBeUndefined()
  })

  it('reports a ranked feed id unchanged', () => {
    useLogRecommendBooksView({
      eventName: 'store_for_you_view',
      isPersonalized: true,
      personalizedCount: 10,
      bookCount: 10,
      feedId: 'a1b2c3d4e5f6',
      nftClassIds: ['0x1'],
    })
    expect(getCapturedProperties().feed_id).toBe('a1b2c3d4e5f6')
  })
})
