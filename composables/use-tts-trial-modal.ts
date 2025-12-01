import { useStorage } from '@vueuse/core'

const TTS_TRIAL_OFFER_KEY = '3ook_tts_trial_offer'
const TTS_TRIAL_COOLDOWN_KEY = '3ook_tts_trial_cooldown'

export function useTTSTrialModal() {
  const { user } = useUserSession()

  const offerTTS = useStorage(TTS_TRIAL_OFFER_KEY, true)

  const offerCooldown = useStorage(TTS_TRIAL_COOLDOWN_KEY, Date.now())

  const isPlus = computed(() => user.value?.isLikerPlus || false)

  const shouldShowTTSTrialModal = computed(() => {
    if (isPlus.value) {
      return false
    }

    return offerTTS.value && Date.now() > offerCooldown.value
  })

  function dismissTTSTrialModal() {
    offerTTS.value = false
  }

  function snoozeTTSTrialModal(durationMs: number) {
    offerCooldown.value = Date.now() + durationMs
  }

  function resetTTSTrialOffer() {
    offerTTS.value = true
    offerCooldown.value = Date.now()
  }

  return {
    offerTTS,
    offerCooldown,
    shouldShowTTSTrialModal,
    dismissTTSTrialModal,
    snoozeTTSTrialModal,
    resetTTSTrialOffer,
  }
}
