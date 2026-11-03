import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { usePlusReadingTracker } from '~/composables/use-plus-reading-tracker'

const NFT_CLASS_ID = '0xabc'

const { mockHasLoggedIn, mockUser, mockBookshelfStore, fetchControl } = vi.hoisted(() => ({
  mockHasLoggedIn: { value: true },
  mockUser: { value: { likerId: 'alice' } as { likerId: string } | undefined },
  mockBookshelfStore: {
    plusReadingBookIds: [] as string[],
    lazyFetchPlusReadingBooks: vi.fn(),
    removePlusReadingBook: vi.fn(),
    registerPlusReadingOpen: vi.fn(),
  },
  fetchControl: { resolve: () => {} },
}))

mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn, user: mockUser }))
mockNuxtImport('useSubscription', () => () => ({ isLikerPlus: ref(false) }))
mockNuxtImport('useQueryCache', () => () => ({}))
mockNuxtImport('useBookshelfStore', () => () => mockBookshelfStore)
mockNuxtImport('useUserBookOwnership', () => () => ({
  isOwner: ref(true),
  checkOwnership: vi.fn().mockResolvedValue(true),
}))
mockNuxtImport('useEntryLinkTagProperties', () => () => ({}))
mockNuxtImport('useLogEvent', () => vi.fn())

// An owned read: the route's nft_id proves ownership, so the tracker goes straight to auto-return.
function mountTracker() {
  return mountSuspended(defineComponent({
    setup() {
      usePlusReadingTracker({
        nftClassId: NFT_CLASS_ID,
        isUploadedBook: ref(false),
        isPlusReadingEnabled: ref(true),
        hasFreeEdition: ref(false),
        nftId: ref('1'),
      })
      return () => h('div')
    },
  }))
}

beforeEach(() => {
  mockHasLoggedIn.value = true
  mockUser.value = { likerId: 'alice' }
  mockBookshelfStore.plusReadingBookIds = [NFT_CLASS_ID]
  mockBookshelfStore.removePlusReadingBook.mockReset()
  mockBookshelfStore.lazyFetchPlusReadingBooks.mockReset()
  mockBookshelfStore.lazyFetchPlusReadingBooks.mockImplementation(() => new Promise<void>((resolve) => {
    fetchControl.resolve = resolve
  }))
})

async function finishShelfFetch() {
  await vi.waitFor(() => expect(mockBookshelfStore.lazyFetchPlusReadingBooks).toHaveBeenCalled())
  fetchControl.resolve()
  await flushPromises()
}

describe('usePlusReadingTracker auto-return', () => {
  it('returns a leftover borrow of an owned book', async () => {
    await mountTracker()
    await finishShelfFetch()
    expect(mockBookshelfStore.removePlusReadingBook).toHaveBeenCalledExactlyOnceWith(NFT_CLASS_ID)
  })

  it('skips the return when the user logs out during the shelf fetch', async () => {
    await mountTracker()
    mockHasLoggedIn.value = false
    mockUser.value = undefined
    await finishShelfFetch()
    expect(mockBookshelfStore.removePlusReadingBook).not.toHaveBeenCalled()
  })

  it('skips the return when the account switches during the shelf fetch', async () => {
    await mountTracker()
    mockUser.value = { likerId: 'bob' }
    await finishShelfFetch()
    expect(mockBookshelfStore.removePlusReadingBook).not.toHaveBeenCalled()
  })
})
