import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAnalytics } from '~/composables/use-analytics'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: { value: {} as Record<string, string> },
}))

mockNuxtImport('useRouteQuery', () => () => (key: string) => mockQuery.value[key] || '')

const globalWin = window as unknown as Record<string, unknown>

function stubInstallAttribution(
  attribution: Record<string, string>,
  installedAt = Date.now(),
) {
  globalWin.__nativeBridge = { installAttribution: { attribution, installedAt } }
}

beforeEach(() => {
  mockQuery.value = {}
  delete globalWin.__nativeBridge
})

describe('getAnalyticsParameters install attribution', () => {
  it('prefers the install referrer over internal link tags and caller defaults', () => {
    mockQuery.value = { ll_source: 'product-page', ll_medium: 'plus-reading-cta' }
    stubInstallAttribution({ utm_source: 'apple_ads', utm_medium: 'cpc' })
    const params = useAnalytics().getAnalyticsParameters({ utmSource: 'checkout' })
    expect(params.utmSource).toBe('apple_ads')
    expect(params.utmMedium).toBe('cpc')
    expect(params.attributionSource).toBe('install_referrer')
  })

  it('keeps a live external UTM above the install referrer', () => {
    mockQuery.value = {
      utm_source: 'facebookads',
      utm_medium: 'paid_Instagram_Feed',
      ll_source: 'product-page',
    }
    stubInstallAttribution({ utm_source: 'apple_ads', utm_medium: 'cpc' })
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.utmSource).toBe('facebookads')
    expect(params.utmMedium).toBe('paid_Instagram_Feed')
    expect(params.attributionSource).toBeUndefined()
  })

  it('falls back to the internal link tag when there is no install attribution', () => {
    mockQuery.value = { ll_source: 'product-page' }
    const params = useAnalytics().getAnalyticsParameters({ utmSource: 'checkout' })
    expect(params.utmSource).toBe('product-page')
    expect(params.attributionSource).toBeUndefined()
  })

  it('uses the caller default only when nothing else resolves', () => {
    const params = useAnalytics().getAnalyticsParameters({ utmSource: 'checkout' })
    expect(params.utmSource).toBe('checkout')
    expect(params.attributionSource).toBeUndefined()
  })

  it('gates click ids on install freshness while utm fields still fill', () => {
    const staleInstalledAt = Date.now() - 8 * 24 * 60 * 60 * 1000
    stubInstallAttribution(
      { utm_source: 'google-play', gclid: 'stale-click', fbclid: 'stale-fb-click' },
      staleInstalledAt,
    )
    const params = useAnalytics().getAnalyticsParameters()
    expect(params.utmSource).toBe('google-play')
    expect(params.gadClickId).toBeFalsy()
    expect(params.fbClickId).toBeFalsy()
    expect(params.attributionSource).toBe('install_referrer')
  })
})
