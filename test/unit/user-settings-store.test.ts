import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'

import { useUserSettingsStore } from '~/stores/user-settings'

const { mockApiFetch, mockHasLoggedIn } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
  mockHasLoggedIn: { value: true },
}))

mockNuxtImport('apiFetch', () => mockApiFetch)
mockNuxtImport('useUserSession', () => () => ({ loggedIn: mockHasLoggedIn }))

describe('useUserSettingsStore', () => {
  let store: ReturnType<typeof useUserSettingsStore>

  beforeEach(() => {
    // The queue is flushed directly here, so hold off the 1s debounced flush
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useUserSettingsStore()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({})
    mockHasLoggedIn.value = true
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('sends one request when every instance flushes in the same tick', async () => {
    store.queueUpdate('currency', 'hkd')

    // A 24-card grid unmounting fires ~72 onBeforeUnmount flushes at once
    await Promise.all(Array.from({ length: 72 }, () => store.flushBatch()))

    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(mockApiFetch.mock.calls[0]?.[1]?.body).toEqual({ currency: 'hkd' })
  })

  it('keeps an update queued during the request', async () => {
    let resolveFetch: () => void = () => {}
    mockApiFetch.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveFetch = resolve
    }))

    store.queueUpdate('currency', 'hkd')
    const pendingFlush = store.flushBatch()
    store.queueUpdate('locale', 'en')
    resolveFetch()
    await pendingFlush

    await store.flushBatch()

    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(mockApiFetch.mock.calls[1]?.[1]?.body).toEqual({ locale: 'en' })
  })

  it('waits for the in-flight request instead of racing it', async () => {
    let resolveFetch: () => void = () => {}
    mockApiFetch.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveFetch = resolve
    }))

    store.queueUpdate('currency', 'hkd')
    const firstFlush = store.flushBatch()
    store.queueUpdate('currency', 'twd')
    const secondFlush = store.flushBatch()

    expect(mockApiFetch).toHaveBeenCalledTimes(1)

    resolveFetch()
    await Promise.all([firstFlush, secondFlush])

    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(mockApiFetch.mock.calls[1]?.[1]?.body).toEqual({ currency: 'twd' })
  })

  it('does not resurrect a value a newer write replaced', async () => {
    let rejectFetch: (error: Error) => void = () => {}
    mockApiFetch.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => {
      rejectFetch = reject
    }))

    store.queueUpdate('currency', 'hkd')
    const firstFlush = store.flushBatch()
    store.queueUpdate('currency', 'twd')
    const secondFlush = store.flushBatch()

    rejectFetch(new Error('offline'))
    await Promise.all([firstFlush, secondFlush])

    // The failed 'hkd' must not requeue behind the 'twd' that replaced it
    await store.flushBatch()

    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(mockApiFetch.mock.calls[1]?.[1]?.body).toEqual({ currency: 'twd' })
  })

  it('requeues a failed sync', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('offline'))

    store.queueUpdate('currency', 'hkd')
    await store.flushBatch()
    await store.flushBatch()

    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(mockApiFetch.mock.calls[1]?.[1]?.body).toEqual({ currency: 'hkd' })
  })

  it('leaves a newer write in place when requeuing a failed sync', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('offline'))

    store.queueUpdate('currency', 'hkd')
    const failingFlush = store.flushBatch()
    store.queueUpdate('currency', 'twd')
    await failingFlush

    await store.flushBatch()

    expect(mockApiFetch.mock.calls[1]?.[1]?.body).toEqual({ currency: 'twd' })
  })
})
