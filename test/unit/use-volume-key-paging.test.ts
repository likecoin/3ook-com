import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useVolumeKeyPaging } from '~/composables/use-volume-key-paging'

const postMessage = vi.fn()
const onNextPage = vi.fn()
const onPreviousPage = vi.fn()
const isActive = ref(true)
const mountedWrappers: { unmount: () => void }[] = []

function getSentStates() {
  return postMessage.mock.calls
    .map(([message]) => JSON.parse(message as string))
    .filter(message => message.type === 'setVolumeKeyPaging')
    .map(message => message.enabled)
}

function pressVolumeKey(direction: 'up' | 'down') {
  window.dispatchEvent(new CustomEvent('nativeBridgeEvent', {
    detail: { type: 'volumeKeyPressed', direction },
  }))
}

async function mountReader() {
  let result!: ReturnType<typeof useVolumeKeyPaging>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      result = useVolumeKeyPaging({ isActive, onNextPage, onPreviousPage })
      return () => h('div')
    },
  }))
  mountedWrappers.push(wrapper)
  await nextTick()
  return { wrapper, ...result }
}

describe('useVolumeKeyPaging', () => {
  beforeEach(() => {
    localStorage.clear()
    postMessage.mockClear()
    onNextPage.mockClear()
    onPreviousPage.mockClear()
    isActive.value = true
    useTTSPlayingState().isTTSPlaying.value = false
    window.ReactNativeWebView = { postMessage }
    window.__nativeBridge = { features: ['volumeKeyPaging'] }
  })

  afterEach(() => {
    // An instance left mounted keeps listening and posting into the next test.
    mountedWrappers.splice(0).forEach(wrapper => wrapper.unmount())
    delete window.ReactNativeWebView
    delete window.__nativeBridge
  })

  it('captures the keys by default and turns pages by direction', async () => {
    const { isSupported, isEnabled } = await mountReader()

    expect(isSupported.value).toBe(true)
    expect(isEnabled.value).toBe(true)
    expect(getSentStates()).toEqual([true])

    pressVolumeKey('down')
    pressVolumeKey('up')
    expect(onNextPage).toHaveBeenCalledTimes(1)
    expect(onPreviousPage).toHaveBeenCalledTimes(1)
  })

  it('releases the keys when switched off, during TTS and on unmount', async () => {
    const { wrapper, isEnabled } = await mountReader()
    const { isTTSPlaying } = useTTSPlayingState()

    isEnabled.value = false
    await nextTick()
    isEnabled.value = true
    await nextTick()
    isTTSPlaying.value = true
    await nextTick()
    pressVolumeKey('down')
    isTTSPlaying.value = false
    await nextTick()
    wrapper.unmount()

    expect(getSentStates()).toEqual([true, false, true, false, true, false])
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('releases the keys while the reader is inactive', async () => {
    await mountReader()
    isActive.value = false
    await nextTick()
    pressVolumeKey('down')

    expect(getSentStates()).toEqual([true, false])
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('stays silent on an app build without the capability', async () => {
    window.__nativeBridge = { features: [] }
    const { wrapper, isSupported } = await mountReader()
    pressVolumeKey('down')
    wrapper.unmount()

    expect(isSupported.value).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
    expect(onNextPage).not.toHaveBeenCalled()
  })
})
