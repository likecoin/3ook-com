import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { useReadingSession } from '~/composables/use-reading-session'

const { mockLogEvent } = vi.hoisted(() => ({ mockLogEvent: vi.fn() }))

mockNuxtImport('useUserSession', () => () => ({ loggedIn: ref(true), user: ref({}) }))
mockNuxtImport('useLogEvent', () => mockLogEvent)

const MINUTE_MS = 60 * 1000

async function mountReader() {
  let recordNavigation!: ReturnType<typeof useReadingSession>['recordNavigation']
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      ({ recordNavigation } = useReadingSession({
        nftClassId: '0xbook',
        readerType: 'pdf',
        progress: ref(0),
        isEnabled: true,
      }))
      return () => h('div')
    },
  }))
  return { wrapper, recordNavigation }
}

function getEndedActiveReadingTimeMs() {
  const call = mockLogEvent.mock.calls.find(([name]) => name === 'reading_session_end')
  return call?.[1].active_reading_time_ms
}

describe('useReadingSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockLogEvent.mockClear()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({}))
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: vi.fn() })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stops counting reading time after two idle minutes', async () => {
    const { wrapper } = await mountReader()
    await vi.advanceTimersByTimeAsync(5 * MINUTE_MS)
    wrapper.unmount()

    expect(getEndedActiveReadingTimeMs()).toBeLessThan(3 * MINUTE_MS)
  })

  it('keeps counting while pages turn without DOM events', async () => {
    const { wrapper, recordNavigation } = await mountReader()
    for (let i = 0; i < 5; i += 1) {
      await vi.advanceTimersByTimeAsync(MINUTE_MS)
      recordNavigation('volume_key')
    }
    wrapper.unmount()

    expect(getEndedActiveReadingTimeMs()).toBeGreaterThanOrEqual(5 * MINUTE_MS - 1000)
  })
})
