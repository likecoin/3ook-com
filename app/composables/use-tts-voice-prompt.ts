import { useStorage } from '@vueuse/core'

const TTS_VOICE_PROMPT_DISMISSED_KEY = '3ook_tts_voice_prompt_dismissed'

export function useTTSVoicePrompt() {
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
}
