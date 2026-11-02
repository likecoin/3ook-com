import { beforeEach, describe, expect, it } from 'vitest'
import { useTTSVoicePrompt } from '~/composables/use-tts-voice-prompt'

beforeEach(() => {
  localStorage.clear()
})

describe('useTTSVoicePrompt', () => {
  it('offers the voice picker on a device that has never been prompted', () => {
    const { shouldShowTTSVoicePrompt } = useTTSVoicePrompt()
    expect(shouldShowTTSVoicePrompt.value).toBe(true)
  })

  it('stops offering once dismissed, including for a later player instance', async () => {
    const { dismissTTSVoicePrompt } = useTTSVoicePrompt()
    dismissTTSVoicePrompt()
    // `useStorage` flushes on the next tick,
    // so a fresh instance read before that still sees the default.
    await nextTick()

    const { shouldShowTTSVoicePrompt } = useTTSVoicePrompt()
    expect(shouldShowTTSVoicePrompt.value).toBe(false)
  })
})
