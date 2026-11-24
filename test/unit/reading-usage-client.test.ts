// @vitest-environment node
// The default `nuxt` (unenv) environment stubs out node:crypto, which this module
// imports for randomUUID; run under real Node and stub the Nuxt-bound imports instead.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forwardReadingUsage } from '~~/server/utils/reading-usage-client'

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

vi.mock('~~/shared/utils/fetch-retry', () => ({ API_MAX_RETRIES: 3 }))
vi.mock('~~/shared/utils/api', () => ({ getLikeCoinAPIFetch: () => mockFetch }))
vi.mock('#app/nuxt', () => ({ useRuntimeConfig: () => ({ plusReadingServiceToken: 'token' }) }))

const baseInput = {
  readerWallet: '0xreader',
  classId: '0xclass',
  readingTimeMs: 60_000,
  ttsTimeMs: 30_000,
}

describe('forwardReadingUsage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({})
  })

  it('sends a borrowed read as library time, leaving plan eligibility to the API', async () => {
    await forwardReadingUsage({ ...baseInput, isBorrowed: true })
    expect(mockFetch.mock.calls[0]?.[1].body).toMatchObject({
      readingTimeMs: 60_000,
      ttsTimeMs: 30_000,
      nonLibraryReadingTimeMs: 0,
      nonLibraryTtsTimeMs: 0,
    })
  })

  it('sends a non-borrowed read as non-library engagement', async () => {
    await forwardReadingUsage({ ...baseInput, isBorrowed: false })
    expect(mockFetch.mock.calls[0]?.[1].body).toMatchObject({
      readingTimeMs: 0,
      ttsTimeMs: 0,
      nonLibraryReadingTimeMs: 60_000,
      nonLibraryTtsTimeMs: 30_000,
    })
  })

  it('skips the call when there is no usage', async () => {
    await forwardReadingUsage({ ...baseInput, readingTimeMs: 0, ttsTimeMs: 0, isBorrowed: true })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
