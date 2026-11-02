import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useBookEndModal } from '~/composables/use-book-end-modal'

const { mockModalOpen, mockLogEvent } = vi.hoisted(() => ({
  mockModalOpen: vi.fn(),
  mockLogEvent: vi.fn(),
}))

mockNuxtImport('useOverlay', () => () => ({
  create: () => ({ open: mockModalOpen }),
}))

mockNuxtImport('useLogEvent', () => mockLogEvent)

mockNuxtImport('useBookInfo', () => () => ({
  getProductPageRoute: () => ({}),
}))

function setup() {
  return useBookEndModal({
    nftClassId: '0xabc',
    isLibraryBook: ref(false),
    isEnabled: true,
  }).handleBookEndBoundary
}

beforeEach(() => {
  mockModalOpen.mockReset()
  mockModalOpen.mockReturnValue({ result: Promise.resolve(undefined) })
  mockLogEvent.mockClear()
})

describe('useBookEndModal', () => {
  // A PDF opened at page 1 reports that page once on load and nothing else
  // until the first turn, which on a two-page PDF already lands on the end.
  it('opens on the first turn after an initial non-end report', () => {
    const handleBookEndBoundary = setup()
    handleBookEndBoundary(false)
    handleBookEndBoundary(true)
    expect(mockModalOpen).toHaveBeenCalledOnce()
  })

  it('stays closed when the restored position is already the end', () => {
    const handleBookEndBoundary = setup()
    handleBookEndBoundary(true)
    expect(mockModalOpen).not.toHaveBeenCalled()
  })

  // A PDF reports a clamped stored page on load and again from the clamp itself.
  it('stays closed across repeated end reports during restore', () => {
    const handleBookEndBoundary = setup()
    handleBookEndBoundary(true)
    handleBookEndBoundary(true)
    expect(mockModalOpen).not.toHaveBeenCalled()
  })

  it('opens only once per read', () => {
    const handleBookEndBoundary = setup()
    handleBookEndBoundary(false)
    handleBookEndBoundary(true)
    handleBookEndBoundary(false)
    handleBookEndBoundary(true)
    expect(mockModalOpen).toHaveBeenCalledOnce()
  })

  it('does nothing when disabled', () => {
    const { handleBookEndBoundary } = useBookEndModal({
      nftClassId: '0xabc',
      isLibraryBook: ref(false),
      isEnabled: false,
    })
    handleBookEndBoundary(false)
    handleBookEndBoundary(true)
    expect(mockModalOpen).not.toHaveBeenCalled()
  })
})
