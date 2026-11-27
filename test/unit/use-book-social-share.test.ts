import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { User } from '#auth-utils'
import { useBookSocialShare } from '~/composables/use-book-social-share'

const { mockUser, mockUseSocialShare } = vi.hoisted(() => ({
  mockUser: { value: null as Partial<User> | null },
  mockUseSocialShare: vi.fn(),
}))

mockNuxtImport('useUserSession', () => () => ({ user: mockUser }))
mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))
mockNuxtImport('useSocialShare', () => mockUseSocialShare)

const NFT_CLASS_ID = '0x1234567890abcdef1234567890abcdef12345678'

function getShareURL(utmSource = 'copy-link', from?: string): string {
  useBookSocialShare({
    nftClassId: ref(NFT_CLASS_ID),
    bookName: ref('Book'),
    authorName: ref(''),
    canonicalURL: ref(`https://3ook.com/store/${NFT_CLASS_ID}`),
    from: ref(from),
    priceIndex: ref(0),
    selectedPricingItemIndex: ref(0),
    isLibrary: ref(false),
  })
  const { getShareURL } = mockUseSocialShare.mock.calls.at(-1)![0]
  return getShareURL(utmSource)
}

describe('useBookSocialShare', () => {
  beforeEach(() => {
    mockUser.value = null
    mockUseSocialShare.mockReset()
  })

  it('credits a renamed sharer by their current handle', () => {
    mockUser.value = { likerId: 'internalid', handle: 'newname' }
    expect(getShareURL()).toMatch(/\/s\/[\w-]+@newname$/)
  })

  it('credits a sharer who never renamed by their Liker ID', () => {
    mockUser.value = { likerId: 'alice' }
    expect(getShareURL()).toMatch(/\/s\/[\w-]+@alice$/)
  })

  it('keeps the incoming affiliate when nobody is logged in', () => {
    expect(getShareURL('copy-link', '@bob')).toMatch(/\/s\/[\w-]+@bob$/)
  })
})
