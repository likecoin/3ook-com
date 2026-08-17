import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { usePostHogAttribution } from '~/composables/use-posthog-attribution'

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: { value: {} as Record<string, string> },
}))

mockNuxtImport('useRouteQuery', () => () => (key: string) => mockQuery.value[key] || '')

beforeEach(() => {
  mockQuery.value = {}
})

describe('usePostHogAttribution', () => {
  it('keeps an internal link tag out of external attribution', () => {
    mockQuery.value = { ll_source: 'product-page', ll_medium: 'plus-reading-cta' }
    const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()
    // Last touch still collapses, so the Stripe/Airtable contract is unchanged.
    expect(lastTouch.utm_source).toBe('product-page')
    expect(lastTouch.utm_medium).toBe('plus-reading-cta')
    // Raw `ll_*` must stay unregistered: a super property is frozen at SDK init,
    // so it would stamp later events with this slot instead of their own.
    expect(lastTouch.ll_source).toBeUndefined()
    expect(lastTouch.ll_medium).toBeUndefined()
    // First touch must not be seeded from in-product navigation.
    expect(externalAttribution).toEqual({})
    expect(linkTags).toEqual({ ll_source: 'product-page', ll_medium: 'plus-reading-cta' })
  })

  it('keeps a real ad source as external attribution when a link tag is also present', () => {
    mockQuery.value = {
      utm_source: 'facebookads',
      utm_medium: 'paid_Instagram_Feed',
      ll_source: 'product-page',
      fbclid: 'abc123',
    }
    const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()
    expect(lastTouch.utm_source).toBe('facebookads')
    expect(externalAttribution.utm_source).toBe('facebookads')
    expect(externalAttribution.utm_medium).toBe('paid_Instagram_Feed')
    expect(externalAttribution.fbclid).toBe('abc123')
    expect(externalAttribution.ll_source).toBeUndefined()
    expect(linkTags.ll_source).toBe('product-page')
  })

  it('still normalizes srsltid to google/organic as external attribution', () => {
    mockQuery.value = { srsltid: 'xyz' }
    const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()
    expect(lastTouch.utm_source).toBe('google')
    expect(lastTouch.utm_medium).toBe('organic')
    expect(externalAttribution.utm_source).toBe('google')
    expect(externalAttribution.utm_medium).toBe('organic')
    expect(linkTags).toEqual({})
  })

  it('returns nothing when no attribution params are present', () => {
    const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()
    expect(lastTouch).toEqual({})
    expect(externalAttribution).toEqual({})
    expect(linkTags).toEqual({})
  })
})
