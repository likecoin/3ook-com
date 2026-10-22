import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReaderProgressRing, { READER_PROGRESS_TICK_DURATION_MS } from '~/components/ReaderProgressRing.vue'

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

const CIRCUMFERENCE = 2 * Math.PI * 8

function getFillOffset(wrapper: Wrapper) {
  return Number(wrapper.find('.reader-progress-ring-fill').attributes('stroke-dashoffset'))
}

function hasTick(wrapper: Wrapper) {
  return wrapper.find('.reader-progress-tick').exists()
}

describe('ReaderProgressRing', () => {
  it('exposes the rounded percentage and fills the arc to match', async () => {
    const wrapper = await mountSuspended(ReaderProgressRing, { props: { progress: 0.256 } })
    expect(wrapper.attributes('aria-valuenow')).toBe('26')
    expect(wrapper.text()).toBe('26%')
    expect(getFillOffset(wrapper)).toBeCloseTo(CIRCUMFERENCE * (1 - 0.256))
  })

  it('clamps out-of-range and non-finite progress', async () => {
    const wrapper = await mountSuspended(ReaderProgressRing, { props: { progress: 1.4 } })
    expect(wrapper.attributes('aria-valuenow')).toBe('100')
    expect(getFillOffset(wrapper)).toBeCloseTo(0)

    await wrapper.setProps({ progress: Number.NaN })
    expect(wrapper.attributes('aria-valuenow')).toBe('0')
    expect(getFillOffset(wrapper)).toBeCloseTo(CIRCUMFERENCE)
  })

  describe('chapter tick', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    async function mountAtChapter(progress: number, chapterKey?: string) {
      return mountSuspended(ReaderProgressRing, { props: { progress, chapterKey } })
    }

    it('shows for the tick duration after a forward chapter change', async () => {
      const wrapper = await mountAtChapter(0.1, 'ch1')
      expect(hasTick(wrapper)).toBe(false)

      await wrapper.setProps({ progress: 0.2, chapterKey: 'ch2' })
      expect(hasTick(wrapper)).toBe(true)

      vi.advanceTimersByTime(READER_PROGRESS_TICK_DURATION_MS - 1)
      await nextTick()
      expect(hasTick(wrapper)).toBe(true)

      vi.advanceTimersByTime(1)
      await nextTick()
      expect(hasTick(wrapper)).toBe(false)
    })

    it('replays with a fresh icon when a chapter changes mid-tick', async () => {
      const wrapper = await mountAtChapter(0.1, 'ch1')
      await wrapper.setProps({ progress: 0.2, chapterKey: 'ch2' })
      const firstIcon = wrapper.find('.reader-progress-tick').element

      vi.advanceTimersByTime(READER_PROGRESS_TICK_DURATION_MS / 2)
      await wrapper.setProps({ progress: 0.3, chapterKey: 'ch3' })
      expect(wrapper.find('.reader-progress-tick').element).not.toBe(firstIcon)

      // The first timer was cleared, so the replay runs its full duration.
      vi.advanceTimersByTime(READER_PROGRESS_TICK_DURATION_MS / 2)
      await nextTick()
      expect(hasTick(wrapper)).toBe(true)
    })

    it('does not tick when the first chapter key lands', async () => {
      const wrapper = await mountAtChapter(0)
      await wrapper.setProps({ progress: 0.3, chapterKey: 'ch3' })
      expect(hasTick(wrapper)).toBe(false)
    })

    it('does not tick when stepping back or when progress has not moved', async () => {
      const wrapper = await mountAtChapter(0.3, 'ch3')
      await wrapper.setProps({ progress: 0.2, chapterKey: 'ch2' })
      expect(hasTick(wrapper)).toBe(false)

      // Progress is still unresolved at cold start, so a key change alone is not enough.
      await wrapper.setProps({ progress: 0.2, chapterKey: 'ch3' })
      expect(hasTick(wrapper)).toBe(false)

      await wrapper.setProps({ progress: 0.3, chapterKey: 'ch4' })
      expect(hasTick(wrapper)).toBe(true)
    })
  })
})
