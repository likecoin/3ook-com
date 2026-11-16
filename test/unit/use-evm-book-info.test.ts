import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockState } = vi.hoisted(() => ({
  mockState: {
    listing: undefined as Partial<BookstoreInfo> | null | undefined,
    chainMetadata: {} as Record<string, unknown>,
  },
}))

mockNuxtImport('getBookstoreInfoByNFTClassIdFromCache', () => () => mockState.listing)
mockNuxtImport('getNFTClassByIdFromCache', () => () => ({ metadata: mockState.chainMetadata }))

const CHAIN_METADATA = {
  name: '書名：副題',
  alternativeHeadline: '鏈上副題',
  isbn: '9789570000000',
  datePublished: '2020-01-02',
}

beforeEach(() => {
  mockState.listing = undefined
  mockState.chainMetadata = { ...CHAIN_METADATA }
})

function getBookInfo() {
  const info = useEVMBookInfo({ nftClassId: '0x1234567890abcdef1234567890abcdef12345678' })
  return {
    name: info.name.value,
    alternativeHeadline: info.alternativeHeadline.value,
    isbn: info.isbn.value,
    publishedDate: info.publishedDate.value?.toISOString().split('T')[0],
  }
}

describe('useEVMBookInfo', () => {
  it('prefers the listing over chain metadata', () => {
    mockState.listing = {
      name: '書名',
      alternativeHeadline: '副題',
      isbn: '9786266531625',
      datePublished: '2024-05-06',
    }
    expect(getBookInfo()).toEqual({
      name: '書名',
      alternativeHeadline: '副題',
      isbn: '9786266531625',
      publishedDate: '2024-05-06',
    })
  })

  it('falls back to chain metadata when the listing has no value', () => {
    mockState.listing = { name: '', alternativeHeadline: '', isbn: '' }
    expect(getBookInfo()).toEqual({
      name: CHAIN_METADATA.name,
      alternativeHeadline: CHAIN_METADATA.alternativeHeadline,
      isbn: CHAIN_METADATA.isbn,
      publishedDate: CHAIN_METADATA.datePublished,
    })
  })

  it('falls back to chain metadata when there is no listing', () => {
    mockState.listing = null
    expect(getBookInfo().name).toBe(CHAIN_METADATA.name)
  })

  it('leaves values empty when neither source has them', () => {
    mockState.listing = null
    mockState.chainMetadata = {}
    expect(getBookInfo()).toEqual({
      name: '',
      alternativeHeadline: undefined,
      isbn: undefined,
      publishedDate: undefined,
    })
  })
})
