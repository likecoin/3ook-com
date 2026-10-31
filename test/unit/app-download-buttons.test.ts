import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppDownloadButtons from '~/components/AppDownloadButtons.vue'
import { useAppDownloadUrls } from '~/composables/use-app-download-urls'

const { mockQuery, mockLogEvent } = vi.hoisted(() => ({
  mockQuery: { value: {} as Record<string, string> },
  mockLogEvent: vi.fn(),
}))

mockNuxtImport('useRouteQuery', () => () => (key: string) => mockQuery.value[key] || '')
mockNuxtImport('useLogEvent', () => mockLogEvent)

// What the book fair roll-up banner QR (link.3ook.com/4ia1OI) redirects to;
// everything but `canto` should reach the store links.
const LINK_PARAMS = {
  utm_source: 'event',
  utm_medium: 'print',
  utm_campaign: 'ukhkbookfair-2026',
  utm_content: 'rollup-banner',
}
const BOOKFAIR_QUERY = { canto: '1', ...LINK_PARAMS }

beforeEach(() => {
  mockQuery.value = {}
  mockLogEvent.mockClear()
})

describe('useAppDownloadUrls', () => {
  it('carries the book fair campaign into both store links', () => {
    mockQuery.value = BOOKFAIR_QUERY
    const { appStoreUrl, googlePlayUrl, params } = useAppDownloadUrls('app_page_hero')

    expect(params).toEqual(LINK_PARAMS)
    const referrer = new URLSearchParams(new URL(googlePlayUrl).searchParams.get('referrer')!)
    expect(Object.fromEntries(referrer)).toEqual(LINK_PARAMS)
    const appStoreParams = new URL(appStoreUrl).searchParams
    expect(appStoreParams.get('ct')).toBe('ukhkbookfair-2026')
    expect(appStoreParams.get('pt')).toBe('128517088')
  })

  it('falls back to the placement when the session has no UTM', () => {
    const { params } = useAppDownloadUrls('about')
    expect(params).toEqual({
      utm_source: '3ookcom',
      utm_medium: 'app_download',
      utm_campaign: 'about',
    })
  })
})

describe('AppDownloadButtons', () => {
  it('logs app_download_click with store, placement and UTM', async () => {
    mockQuery.value = BOOKFAIR_QUERY
    const wrapper = await mountSuspended(AppDownloadButtons, { props: { placement: 'app_page_cta' } })
    const [appStoreButton, googlePlayButton] = wrapper.findAll('a')

    await appStoreButton!.trigger('click')
    await googlePlayButton!.trigger('click')

    for (const store of ['app_store', 'google_play']) {
      expect(mockLogEvent).toHaveBeenCalledWith('app_download_click', {
        store,
        placement: 'app_page_cta',
        ...LINK_PARAMS,
      })
    }
    expect(wrapper.emitted('clickAppStore')).toHaveLength(1)
    expect(wrapper.emitted('clickGooglePlay')).toHaveLength(1)
  })
})
