import { createSharedComposable, useStorage } from '@vueuse/core'

const TTS_VOICE_PROMPT_DISMISSED_KEY = '3ook_tts_voice_prompt_dismissed'

// Shared so the try modal's dismissal reaches the player in the same tab
// without waiting for useStorage to flush to localStorage.
export const useTTSVoicePrompt = createSharedComposable(() => {
  const isDismissed = useStorage(TTS_VOICE_PROMPT_DISMISSED_KEY, false)

  const shouldShowTTSVoicePrompt = computed(() => !isDismissed.value)

  // Showing the picker counts as prompting, whether or not a voice is then picked —
  // the offer is meant to appear once per device.
  function dismissTTSVoicePrompt() {
    isDismissed.value = true
  }

  return {
    shouldShowTTSVoicePrompt,
    dismissTTSVoicePrompt,
  }
})
