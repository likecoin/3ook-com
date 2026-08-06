import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { usePlusUpsellImpression, usePlusUpsellSlot } from '~/composables/use-plus-upsell-slot'

const { mockLogPlusUpsell, visibilityHandlers } = vi.hoisted(() => ({
  mockLogPlusUpsell: vi.fn(),
  visibilityHandlers: [] as ((isVisible: boolean) => void)[],
}))

mockNuxtImport('useVisibility', () => (
  _key: string,
  handler?: (isVisible: boolean) => void,
) => {
  if (handler) visibilityHandlers.push(handler)
  return { isVisible: ref(false) }
})

mockNuxtImport('useLogPlusUpsell', () => mockLogPlusUpsell)

// Each call stands in for one mounted slot component; the returned callback is
// what the intersection observer would invoke.
function mountSlot(slot: string, source = 'account-page') {
  const { handlePlusUpsellClick } = usePlusUpsellSlot({
    templateRef: `${slot}Ref`,
    slot: slot as never,
    source: source as never,
  })
  return { handlePlusUpsellClick, setVisible: visibilityHandlers.at(-1)! }
}

function mountImpression(slot: string, isEligible: boolean, source = 'account-page') {
  usePlusUpsellImpression({
    templateRef: `${slot}Ref`,
    slot: slot as never,
    source: source as never,
    isEligible,
  })
  return { setVisible: visibilityHandlers.at(-1)! }
}

beforeEach(() => {
  sessionStorage.clear()
  visibilityHandlers.length = 0
  mockLogPlusUpsell.mockClear()
})

describe('usePlusUpsellSlot', () => {
  it('logs one impression per slot per session across remounts', async () => {
    mountSlot('color-mode').setVisible(true)
    expect(mockLogPlusUpsell).toHaveBeenCalledExactlyOnceWith('impression', {
      llMedium: 'color-mode',
      llSource: 'account-page',
    })

    mountSlot('color-mode').setVisible(true)
    expect(mockLogPlusUpsell).toHaveBeenCalledOnce()
  })

  // The shelf mounts one slot per locked cover, and they all intersect in the
  // same observer callback — the dedup has to hold without a tick in between.
  it('logs one impression when sibling slots become visible together', () => {
    const covers = [mountSlot('plus-reading-locked', 'shelf'), mountSlot('plus-reading-locked', 'shelf')]
    covers.forEach(cover => cover.setVisible(true))

    expect(mockLogPlusUpsell).toHaveBeenCalledExactlyOnceWith('impression', {
      llMedium: 'plus-reading-locked',
      llSource: 'shelf',
    })
  })

  it('dedups each slot independently', () => {
    mountSlot('color-mode').setVisible(true)
    mountSlot('custom-voice').setVisible(true)

    expect(mockLogPlusUpsell).toHaveBeenCalledTimes(2)
    expect(mockLogPlusUpsell).toHaveBeenLastCalledWith('impression', {
      llMedium: 'custom-voice',
      llSource: 'account-page',
    })
  })

  it('logs no impression for an ineligible view', () => {
    mountImpression('tts-plus-tag', false).setVisible(true)
    expect(mockLogPlusUpsell).not.toHaveBeenCalled()
  })

  // An ineligible view must not consume the slot: a member sees the tag as a
  // keyword link, and that must not silence the next non-member's impression.
  it('leaves the slot unrecorded when an ineligible view is seen first', () => {
    mountImpression('tts-plus-tag', false).setVisible(true)
    mountImpression('tts-plus-tag', true).setVisible(true)

    expect(mockLogPlusUpsell).toHaveBeenCalledExactlyOnceWith('impression', {
      llMedium: 'tts-plus-tag',
      llSource: 'account-page',
    })
  })

  it('logs no impression while the slot is off screen', () => {
    mountSlot('color-mode').setVisible(false)
    expect(mockLogPlusUpsell).not.toHaveBeenCalled()
  })

  it('logs every click even after the impression is deduped', async () => {
    const first = mountSlot('color-mode')
    first.setVisible(true)
    await nextTick()

    first.handlePlusUpsellClick()
    first.handlePlusUpsellClick()
    mountSlot('color-mode').handlePlusUpsellClick()

    expect(mockLogPlusUpsell.mock.calls.filter(([action]) => action === 'click')).toHaveLength(3)
    expect(mockLogPlusUpsell).toHaveBeenLastCalledWith('click', {
      llMedium: 'color-mode',
      llSource: 'account-page',
    })
  })
})
