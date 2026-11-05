import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookstoreItem from '~/components/BookstoreItem.vue'

const { mockState } = vi.hoisted(() => ({
  mockState: { subdomainLikerId: '', query: {} as Record<string, string> },
}))

mockNuxtImport('usePublisherSubdomainLikerId', () => () => mockState.subdomainLikerId)
mockNuxtImport('useRouteQuery', () => () => (key: string) => mockState.query[key] || '')
// The real one pulls in the bookshelf store, which needs wagmi; only the route
// builder matters here, and it takes the card's query as given.
mockNuxtImport('useBookInfo', () => ({ nftClassId }: { nftClassId: string }) => {
  const localeRoute = useLocaleRoute()
  return {
    coverSrc: ref(''),
    name: ref(''),
    authorName: ref(''),
    minPrice: ref(0),
    minPricingItem: ref(undefined),
    isPlusReadingEnabled: ref(false),
    isDisplayOnly: ref(false),
    isNonNFT: ref(false),
    nftClassOwnerWalletAddress: ref(''),
    getAuthorPageRoute: () => ({ name: 'store' }),
    getProductPageRoute: ({ query }: { query?: Record<string, string> }) => localeRoute({
      name: 'store-nftClassId',
      params: { nftClassId },
      query,
    }),
  }
})

const NFT_CLASS_ID = '0x1234567890abcdef1234567890abcdef12345678'

async function getBookLinks(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(BookstoreItem, {
    props: { nftClassId: NFT_CLASS_ID, likeRank: 1, ...props },
  })
  return wrapper.findAll('a')
    .map(link => new URL(link.attributes('href')!, 'https://3ook.com'))
    .filter(url => url.pathname.endsWith(NFT_CLASS_ID))
}

beforeEach(() => {
  mockState.subdomainLikerId = ''
  mockState.query = {}
})

describe('BookstoreItem', () => {
  it('tags book links with the subdomain publisher as from', async () => {
    mockState.subdomainLikerId = 'ckxpress'
    const links = await getBookLinks({ tag: 'latest' })

    // The cover and the like-rank staking link.
    expect(links).toHaveLength(2)
    for (const url of links) {
      expect(url.searchParams.get('from')).toBe('@ckxpress')
      expect(url.searchParams.get('tag')).toBe('latest')
    }
  })

  it('keeps an explicit referrer on the subdomain', async () => {
    mockState.subdomainLikerId = 'ckxpress'
    mockState.query = { from: '@zkcjwp' }
    const links = await getBookLinks()

    expect(links.map(url => url.searchParams.get('from'))).toEqual(['@zkcjwp', '@zkcjwp'])
  })

  it('leaves book links on the apex without from', async () => {
    mockState.query = { from: '@zkcjwp' }
    const links = await getBookLinks()

    expect(links).toHaveLength(2)
    for (const url of links) expect(url.searchParams.has('from')).toBe(false)
  })

  it('tags the chart card link as well', async () => {
    mockState.subdomainLikerId = 'ckxpress'
    const links = await getBookLinks({ variant: 'chart', rank: 1 })

    expect(links.map(url => url.searchParams.get('from'))).toEqual(['@ckxpress'])
  })
})
