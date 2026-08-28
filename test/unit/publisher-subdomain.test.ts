import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import publisherSubdomainMiddleware from '~/middleware/publisher-subdomain.global'
import {
  getLocalePathPrefixes,
  getPublisherSubdomainAction,
  getPublisherSubdomainHost,
} from '~~/shared/constants/publisher-subdomain'

const { mockNavigateTo, mockHost } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockHost: { value: '3ook.com' },
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useRequestURL', () => () => new URL(`https://${mockHost.value}/`))
// The real one needs an i18n-aware router; the locale suffix is all that matters here.
mockNuxtImport('useRouteBaseNameString', () => () => (route: { name?: string }) =>
  String(route?.name ?? '').split('___')[0] ?? '')

const LOCALE_PREFIXES = ['/en', '']

function createRoute(name: string, params: Record<string, string> = {}, fullPath = '/') {
  return { name, params, fullPath } as unknown as Parameters<typeof publisherSubdomainMiddleware>[0]
}

function runMiddleware(host: string, route = createRoute('store-userId___zh-Hant', { userId: 'ckxpress' })) {
  mockHost.value = host
  return publisherSubdomainMiddleware(route, createRoute('index'))
}

describe('getPublisherSubdomainHost', () => {
  const PUBLISHER = { type: 'publisher', likerId: 'ckxpress' }

  it('resolves an approved label', () => {
    expect(getPublisherSubdomainHost('ckxpress.3ook.com', 'https://3ook.com')).toEqual(PUBLISHER)
  })

  it('ignores ports and casing, so local dev matches production', () => {
    expect(getPublisherSubdomainHost('CKXPRESS.localhost:3000', 'http://localhost:3000')).toEqual(PUBLISHER)
  })

  it('claims every other host under the apex, deeper ones included', () => {
    expect(getPublisherSubdomainHost('t.3ook.com', 'https://3ook.com')).toEqual({ type: 'unclaimed' })
    expect(getPublisherSubdomainHost('a.ckxpress.3ook.com', 'https://3ook.com')).toEqual({ type: 'unclaimed' })
  })

  it('leaves the apex and hosts outside it alone', () => {
    expect(getPublisherSubdomainHost('3ook.com', 'https://3ook.com')).toEqual({ type: 'none' })
    expect(getPublisherSubdomainHost('not3ook.com', 'https://3ook.com')).toEqual({ type: 'none' })
    expect(getPublisherSubdomainHost('ckxpress.3ook.com.example.com', 'https://3ook.com')).toEqual({ type: 'none' })
  })

  it('claims nothing rather than throwing on a malformed base URL', () => {
    expect(getPublisherSubdomainHost('ckxpress.3ook.com', '3ook.com')).toEqual({ type: 'none' })
  })
})

describe('getLocalePathPrefixes', () => {
  it('leaves the default locale unprefixed', () => {
    expect(getLocalePathPrefixes({
      defaultLocale: 'zh-Hant',
      locales: [{ code: 'en' }, { code: 'zh-Hant' }],
    })).toEqual(LOCALE_PREFIXES)
  })
})

describe('getPublisherSubdomainAction', () => {
  const getAction = (pathname: string) => getPublisherSubdomainAction(pathname, 'ckxpress', LOCALE_PREFIXES)

  it('passes the SSR render its own subrequests', () => {
    expect(getAction('/api/_auth/session')).toEqual({ type: 'pass' })
    expect(getAction('/_i18n/en.json')).toEqual({ type: 'pass' })
  })

  it('404s the per-origin PWA assets', () => {
    expect(getAction('/sw.js')).toEqual({ type: 'notFound' })
    expect(getAction('/manifest.webmanifest')).toEqual({ type: 'notFound' })
  })

  it('serves the storefront in both locales', () => {
    expect(getAction('/store/@ckxpress')).toEqual({ type: 'pass' })
    expect(getAction('/en/store/@ckxpress')).toEqual({ type: 'pass' })
  })

  it('sends the localized roots into the storefront', () => {
    expect(getAction('/')).toEqual({ type: 'self', path: '/store/@ckxpress' })
    expect(getAction('/en')).toEqual({ type: 'self', path: '/en/store/@ckxpress' })
    expect(getAction('/en/')).toEqual({ type: 'self', path: '/en/store/@ckxpress' })
  })

  it('normalizes a trailing slash or upper-case handle instead of bouncing', () => {
    expect(getAction('/store/@ckxpress/')).toEqual({ type: 'self', path: '/store/@ckxpress' })
    expect(getAction('/store/@CKXPRESS')).toEqual({ type: 'self', path: '/store/@ckxpress' })
  })

  it('sends every other path to the apex, the library twin included', () => {
    expect(getAction('/pricing')).toEqual({ type: 'apex', path: '/pricing' })
    expect(getAction('/store/@someone')).toEqual({ type: 'apex', path: '/store/@someone' })
    expect(getAction('/library/@ckxpress')).toEqual({ type: 'apex', path: '/library/@ckxpress' })
  })
})

describe('publisher-subdomain.global', () => {
  beforeEach(() => mockNavigateTo.mockClear())

  it('leaves the apex alone', () => {
    runMiddleware('3ook.com', createRoute('store___zh-Hant'))
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('sends an unclaimed subdomain to the apex, storefront route or not', () => {
    runMiddleware('t.3ook.com', createRoute('store___zh-Hant', {}, '/store'))
    runMiddleware('t.3ook.com', createRoute('store-userId___zh-Hant', { userId: 'ckxpress' }, '/store/@ckxpress'))
    expect(mockNavigateTo).toHaveBeenNthCalledWith(1, 'https://3ook.com/store', { external: true })
    expect(mockNavigateTo).toHaveBeenNthCalledWith(2, 'https://3ook.com/store/@ckxpress', { external: true })
  })

  it('stays put on the subdomain owner storefront, in either locale or casing', () => {
    runMiddleware('ckxpress.3ook.com')
    runMiddleware('ckxpress.3ook.com', createRoute('store-userId___en', { userId: 'CKXPRESS' }))
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('sends another publisher storefront to the apex', () => {
    runMiddleware(
      'ckxpress.3ook.com',
      createRoute('store-userId___zh-Hant', { userId: 'someone' }, '/store/@someone'),
    )
    expect(mockNavigateTo).toHaveBeenCalledWith('https://3ook.com/store/@someone', { external: true })
  })

  it('sends the library twin and every other route to the apex', () => {
    runMiddleware('ckxpress.3ook.com', createRoute('library-userId___zh-Hant', { userId: 'ckxpress' }, '/library/@ckxpress'))
    runMiddleware('ckxpress.3ook.com', createRoute('store-nftClassId___zh-Hant', {}, '/store/0xabc?tag=fiction'))
    expect(mockNavigateTo).toHaveBeenNthCalledWith(1, 'https://3ook.com/library/@ckxpress', { external: true })
    expect(mockNavigateTo).toHaveBeenNthCalledWith(2, 'https://3ook.com/store/0xabc?tag=fiction', { external: true })
  })
})
