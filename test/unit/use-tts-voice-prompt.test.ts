import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useTTSVoicePrompt } from '~/composables/use-tts-voice-prompt'

// The shared state is torn down only when its last scope stops,
// so each test runs in its own scope to start from storage again.
let scope: ReturnType<typeof effectScope>

beforeEach(() => {
  localStorage.clear()
  scope = effectScope()
})

afterEach(() => {
  scope.stop()
})

describe('useTTSVoicePrompt', () => {
  it('offers the voice picker on a device that has never been prompted', () => {
    const { shouldShowTTSVoicePrompt } = scope.run(useTTSVoicePrompt)!
    expect(shouldShowTTSVoicePrompt.value).toBe(true)
  })

  it('stops offering at once for another caller in the same tab', () => {
    const { dismissTTSVoicePrompt } = scope.run(useTTSVoicePrompt)!
    const { shouldShowTTSVoicePrompt } = scope.run(useTTSVoicePrompt)!
    dismissTTSVoicePrompt()
    expect(shouldShowTTSVoicePrompt.value).toBe(false)
  })

  it('keeps the dismissal for a later session', async () => {
    scope.run(useTTSVoicePrompt)!.dismissTTSVoicePrompt()
    await nextTick()
    scope.stop()

    scope = effectScope()
    const { shouldShowTTSVoicePrompt } = scope.run(useTTSVoicePrompt)!
    expect(shouldShowTTSVoicePrompt.value).toBe(false)
  })
})
