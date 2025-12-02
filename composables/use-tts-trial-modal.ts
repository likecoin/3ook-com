import { useStorage } from '@vueuse/core'

const TTS_TRY_OFFER_KEY = '3ook_tts_try_offer'
const TTS_TRY_COOLDOWN_KEY = '3ook_tts_try_cooldown'

export function useTTSTryModal() {
  const { user } = useUserSession()

  const hasTTSTrialOffered = useStorage(TTS_TRY_OFFER_KEY, true)

  const offerCooldown = useStorage(TTS_TRY_COOLDOWN_KEY, Date.now())

  const isPlus = computed(() => user.value?.isLikerPlus || false)

  const shouldShowTTSTryModal = computed(() => {
    if (isPlus.value) {
      return false
    }

    return hasTTSTrialOffered.value && Date.now() > offerCooldown.value
  })

  function dismissTTSTryModal() {
    hasTTSTrialOffered.value = false
  }

  function snoozeTTSTryModal(durationMs: number) {
    offerCooldown.value = Date.now() + durationMs
  }

  function resetTTSTryOffer() {
    hasTTSTrialOffered.value = true
    offerCooldown.value = Date.now()
  }

  return {
    hasTTSTrialOffered,
    offerCooldown,
    shouldShowTTSTryModal,
    dismissTTSTryModal,
    snoozeTTSTryModal,
    resetTTSTryOffer,
  }
}
