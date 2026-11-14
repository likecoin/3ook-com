import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookstoreItem from '~/components/BookstoreItem.vue'

const { mockState } = vi.hoisted(() => ({
  mockState: {
    subdomainLikerId: '',
    query: {} as Record<string, string>,
    currency: 'usd',
    merchPricingItem: undefined as Record<string, unknown> | undefined,
  },
}))

mockNuxtImport('usePaymentCurrency', () => () => ({ displayCurrency: computed(() => mockState.currency) }))
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
    minPricingItem: ref(mockState.merchPricingItem),
    isPlusReadingEnabled: ref(false),
    isDisplayOnly: ref(false),
    isNonNFT: ref(!!mockState.merchPricingItem),
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
  mockState.currency = 'usd'
  setUser(null)
  mockState.merchPricingItem = undefined
})

// Mocking useUserSession would also break the i18n plugin, so seed its state.
function setUser(user: Record<string, unknown> | null) {
  useState('nuxt-session').value = user && { user }
}

// A BOOX reader: HK$1,998, or HK$1,698 for yearly Plus.
async function mountMerchItem() {
  mockState.currency = 'hkd'
  mockState.merchPricingItem = {
    price: 249.99,
    priceInDecimalByCurrency: { hkd: 199800 },
    plusPrice: 214.99,
    plusPriceInDecimalByCurrency: { hkd: 169800 },
  }
  return mountSuspended(BookstoreItem, {
    props: { nftClassId: NFT_CLASS_ID, price: 249.99, priceOverride: { hkd: 199800 } },
  })
}

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

  it('shows a non-member the Plus price chip under a paid book', async () => {
    const wrapper = await mountSuspended(BookstoreItem, {
      props: { nftClassId: NFT_CLASS_ID, price: 9.99 },
    })

    expect(wrapper.text()).toContain('US$9.99')
    expect(wrapper.text()).toContain('US$7.99')
    expect(wrapper.find('.line-through').exists()).toBe(false)
  })

  it('shows a Plus member the chip over the struck-through list price', async () => {
    setUser({ isLikerPlus: true, likerPlusPeriod: 'month' })
    const wrapper = await mountSuspended(BookstoreItem, {
      props: { nftClassId: NFT_CLASS_ID, price: 9.99 },
    })

    expect(wrapper.text()).toContain('US$7.99')
    expect(wrapper.find('.line-through').text()).toBe('US$9.99')
  })

  it('shows no Plus price under a free book', async () => {
    const wrapper = await mountSuspended(BookstoreItem, {
      props: { nftClassId: NFT_CLASS_ID, price: 0 },
    })

    expect(wrapper.findComponent({ name: 'PlusPriceChip' }).exists()).toBe(false)
  })

  it('shows no Plus price under a book on a referred visit', async () => {
    mockState.query = { from: '@zkcjwp' }
    const wrapper = await mountSuspended(BookstoreItem, {
      props: { nftClassId: NFT_CLASS_ID, price: 9.99 },
    })

    expect(wrapper.findComponent({ name: 'PlusPriceChip' }).exists()).toBe(false)
  })

  it('gives a yearly Plus member the gift item\'s member price', async () => {
    setUser({ isLikerPlus: true, likerPlusPeriod: 'year' })
    const wrapper = await mountMerchItem()

    expect(wrapper.findComponent({ name: 'PlusPriceChip' }).props('price')).toBe('HK$1,698')
    expect(wrapper.find('.line-through').text()).toBe('HK$1,998')
  })
})
