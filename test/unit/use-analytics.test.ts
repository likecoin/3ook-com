import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { PLUS_UPSELL_SOURCES, getIsInternalLLSource } from '~~/shared/constants/analytics'
import { useAnalytics } from '~/composables/use-analytics'

const { mockQuery, mockPostHog, mockGetInstallAttribution } = vi.hoisted(() => ({
  mockQuery: { value: {} as Record<string, string> },
  // `null` models PostHog being blocked or never loading: `onLoaded` never fires.
  mockPostHog: { value: null as { get_property?: (key: string) => unknown } | null },
  mockGetInstallAttribution: vi.fn(() => null),
}))

vi.mock('~/utils/native-bridge', () => ({
  getInstallAttribution: mockGetInstallAttribution,
}))

// Run the mount hook inline so the composable can be exercised without a component.
mockNuxtImport('onMounted', () => (fn: () => void) => fn())
mockNuxtImport('useRouteQuery', () => () => (key: string) => mockQuery.value[key] || '')
// The test runtime config leaves the GA id empty, so the gtag branch is skipped.
mockNuxtImport('useScriptGoogleAnalytics', () => () => ({ proxy: { gtag: vi.fn() } }))
mockNuxtImport('useScriptPostHog', () => () => ({
  onLoaded: (fn: (ctx: { posthog: unknown }) => void) => {
    if (mockPostHog.value) fn({ posthog: mockPostHog.value })
  },
}))

function setInitialProperties(properties: Record<string, unknown>) {
  mockPostHog.value = { get_property: (key: string) => properties[key] }
}

beforeEach(() => {
  mockQuery.value = {}
  mockPostHog.value = null
  mockGetInstallAttribution.mockReturnValue(null)
})

describe('useAnalytics first-touch attribution', () => {
  it('passes a genuine external first-touch source through', () => {
    setInitialProperties({
      initial_utm_source: 'facebookads',
      initial_utm_medium: 'paid_Instagram_Feed',
      initial_utm_campaign: '120210000000000000',
    })
    const { getAnalyticsParameters } = useAnalytics()
    const params = getAnalyticsParameters()
    expect(params.initialUtmSource).toBe('facebookads')
    expect(params.initialUtmMedium).toBe('paid_Instagram_Feed')
    expect(params.initialUtmCampaign).toBe('120210000000000000')
  })

  it('filters a legacy internal surface out of first-touch', () => {
    setInitialProperties({
      initial_utm_source: 'bookstore',
      initial_utm_medium: 'plus-reading-cta',
    })
    const { getAnalyticsParameters } = useAnalytics()
    const params = getAnalyticsParameters()
    expect(params.initialUtmSource).toBeUndefined()
    // The medium came from the same polluted touch, so it goes too.
    expect(params.initialUtmMedium).toBeUndefined()
  })

  it('filters an internal surface regardless of casing', () => {
    setInitialProperties({ initial_utm_source: 'Product-Page' })
    const { getAnalyticsParameters } = useAnalytics()
    expect(getAnalyticsParameters().initialUtmSource).toBeUndefined()
  })

  it('filters an internal surface carrying a glued-on query string', () => {
    setInitialProperties({ initial_utm_source: 'bookshelf-item?from=@someone' })
    const { getAnalyticsParameters } = useAnalytics()
    expect(getAnalyticsParameters().initialUtmSource).toBeUndefined()
  })

  it('filters an NFT class id used as a surface', () => {
    setInitialProperties({
      initial_utm_source: '0x1234567890abcdef1234567890abcdef12345678',
    })
    const { getAnalyticsParameters } = useAnalytics()
    expect(getAnalyticsParameters().initialUtmSource).toBeUndefined()
  })

  it('drops an internal medium recorded without any source', () => {
    setInitialProperties({ initial_utm_medium: 'color-mode' })
    const { getAnalyticsParameters } = useAnalytics()
    // A first touch with no source names no channel, so nothing is trustworthy.
    expect(getAnalyticsParameters().initialUtmMedium).toBeUndefined()
  })

  it('does not fall back to last-touch when there is no first-touch', () => {
    mockQuery.value = { utm_source: 'facebookads' }
    setInitialProperties({})
    const { getAnalyticsParameters } = useAnalytics()
    const params = getAnalyticsParameters()
    expect(params.utmSource).toBe('facebookads')
    expect(params.initialUtmSource).toBeUndefined()
  })

  it('omits the fields when PostHog never loads', () => {
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.initialUtmSource).toBeUndefined()
    expect(params.initialUtmMedium).toBeUndefined()
    expect(params.initialUtmCampaign).toBeUndefined()
  })

  it('omits the fields when PostHog exposes no get_property', () => {
    mockPostHog.value = {}
    // The read happens on mount, so the throw would surface from useAnalytics().
    expect(() => useAnalytics()).not.toThrow()
    expect(useAnalytics().getAnalyticsParameters().initialUtmSource).toBeUndefined()
  })
})

describe('getIsInternalLLSource', () => {
  // Upsell sources are passed straight through as `ll_source`, so a new one must
  // never reach first-touch just because nobody remembered the denylist.
  it('covers every Plus upsell source', () => {
    for (const source of PLUS_UPSELL_SOURCES) {
      expect(getIsInternalLLSource(source)).toBe(true)
    }
  })

  it('lets a genuine external source through', () => {
    expect(getIsInternalLLSource('facebookads')).toBe(false)
    expect(getIsInternalLLSource('ig?fbclid=abc')).toBe(false)
    expect(getIsInternalLLSource(undefined)).toBe(false)
  })
})
