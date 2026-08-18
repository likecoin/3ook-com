import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { PLUS_UPSELL_SOURCES, getIsInternalLLSource } from '~~/shared/constants/analytics'
import { useAnalytics } from '~/composables/use-analytics'

const { mockQuery, mockPostHog, mockGetInstallAttribution } = vi.hoisted(() => ({
  mockQuery: { value: {} as Record<string, string> },
  // `null` models PostHog being blocked or never loading: `onLoaded` never fires.
  mockPostHog: { value: null as { get_property?: (key: string) => unknown } | null },
  mockGetInstallAttribution: vi.fn((): InstallAttribution | null => null),
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

describe('getAnalyticsParameters acquisition channel', () => {
  function setInstallAttribution(attribution: Record<string, string>) {
    mockGetInstallAttribution.mockReturnValue({ attribution, installedAt: Date.now() })
  }

  it('prefers the install referrer over an internal live surface', () => {
    mockQuery.value = { ll_source: 'product-page', utm_campaign: 'live-campaign' }
    setInstallAttribution({ utm_source: 'apple_ads', utm_medium: 'cpc', utm_campaign: '1234' })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBe('apple_ads')
    expect(params.campaign).toBe('1234')
  })

  it('falls through an organic store install to a live campaign link', () => {
    mockQuery.value = { utm_source: 'facebookads', utm_campaign: '120210000000000000' }
    setInstallAttribution({ utm_source: 'google-play', utm_medium: 'organic' })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBe('facebookads')
    expect(params.campaign).toBe('120210000000000000')
  })

  it('rejects an install referrer our own download links tagged', () => {
    // useAppDownloadUrls falls back to `3ookcom`/`app_download` when the visitor
    // carried no campaign, so the store hands back an internal surface.
    setInstallAttribution({
      utm_source: '3ookcom',
      utm_medium: 'app_download',
      utm_campaign: 'app_page_hero',
    })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBeUndefined()
    expect(params.campaign).toBeUndefined()
  })

  it('names no channel for an organic install with nothing else', () => {
    setInstallAttribution({ utm_source: 'google-play', utm_medium: 'organic' })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBeUndefined()
    expect(params.campaign).toBeUndefined()
  })

  it('never lets an internal link tag name the channel', () => {
    mockQuery.value = { ll_source: 'product-page' }
    const params = useAnalytics().getAnalyticsParameters()
    // The same surface still rides `utmSource`, which the grant webhook reads.
    expect(params.utmSource).toBe('product-page')
    expect(params.mediaSource).toBeUndefined()
  })

  it('rejects an internal surface passed as a live utm_source', () => {
    mockQuery.value = { utm_source: 'bookstore', utm_campaign: 'live-campaign' }
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBeUndefined()
    expect(params.campaign).toBeUndefined()
  })

  it('falls back to first-touch when the live source is internal', () => {
    mockQuery.value = { utm_source: 'bookstore' }
    setInitialProperties({
      initial_utm_source: 'facebookads',
      initial_utm_campaign: '120210000000000000',
    })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBe('facebookads')
    expect(params.campaign).toBe('120210000000000000')
  })

  it('does not pair a campaign with a source from another rung', () => {
    mockQuery.value = { utm_campaign: 'live-campaign' }
    setInstallAttribution({ utm_source: 'apple_ads', utm_medium: 'cpc' })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.mediaSource).toBe('apple_ads')
    expect(params.campaign).toBeUndefined()
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
