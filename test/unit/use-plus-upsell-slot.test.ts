import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import { usePlusUpsellSlot } from '~/composables/use-plus-upsell-slot'

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

    // The sessionStorage write flushes on `pre`, so a remount only sees the
    // recorded slot after a tick.
    await nextTick()
    mountSlot('color-mode').setVisible(true)
    expect(mockLogPlusUpsell).toHaveBeenCalledOnce()
  })

  it('dedups each slot independently', async () => {
    mountSlot('color-mode').setVisible(true)
    await nextTick()
    mountSlot('custom-voice').setVisible(true)

    expect(mockLogPlusUpsell).toHaveBeenCalledTimes(2)
    expect(mockLogPlusUpsell).toHaveBeenLastCalledWith('impression', {
      llMedium: 'custom-voice',
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
