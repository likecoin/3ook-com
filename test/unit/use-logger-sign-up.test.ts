import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { User } from '#auth-utils'
import { useSetLogSignUp, useSetLogUser } from '~/composables/use-logger'

const { mockIdentify } = vi.hoisted(() => ({ mockIdentify: vi.fn() }))

mockNuxtImport('useScriptGoogleAnalytics', () => () => ({ proxy: { gtag: vi.fn() } }))
mockNuxtImport('useScriptMetaPixel', () => () => ({ proxy: { fbq: vi.fn() } }))
mockNuxtImport('useScriptPostHog', () => () => {
  const posthog = { identify: mockIdentify, get_property: () => undefined, reset: vi.fn() }
  return {
    proxy: { posthog },
    onLoaded: (callback: (instance: { posthog: typeof posthog }) => void) => callback({ posthog }),
  }
})

function makeUser(evmWallet: string) {
  return { evmWallet, hasPendingPlusDowngrade: false } as User
}

function getIdentifySetOnce() {
  expect(mockIdentify).toHaveBeenCalledTimes(1)
  return mockIdentify.mock.calls[0]![2] as Record<string, string>
}

beforeEach(() => {
  mockIdentify.mockClear()
  localStorage.clear()
})

describe('signed_up_at person property', () => {
  it('sets it once on the identify of the wallet that signed up', () => {
    useSetLogSignUp('0xAbC')
    useSetLogUser(makeUser('0xabc'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    mockIdentify.mockClear()
    useSetLogUser(makeUser('0xabc'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toBeUndefined()
  })

  // A signup abandoned at the signature step must not stamp another wallet,
  // nor lose its own timestamp when another wallet signs up meanwhile.
  it('keeps each wallet\'s timestamp until that wallet is identified', () => {
    useSetLogSignUp('0xaaa')
    useSetLogSignUp('0xbbb')
    useSetLogUser(makeUser('0xbbb'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toBeDefined()

    mockIdentify.mockClear()
    useSetLogUser(makeUser('0xccc'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toBeUndefined()

    mockIdentify.mockClear()
    useSetLogUser(makeUser('0xaaa'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toBeDefined()
  })

  it('survives a reload before identify', async () => {
    useSetLogSignUp('0xabc')
    vi.resetModules()
    const reloaded = await import('~/composables/use-logger')
    reloaded.useSetLogUser(makeUser('0xabc'), 'en')
    expect(getIdentifySetOnce().signed_up_at).toBeDefined()
  })
})
