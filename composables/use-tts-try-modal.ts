import { useStorage } from '@vueuse/core'

const TTS_TRY_OFFER_KEY = '3ook_tts_try_offer'
const TTS_TRY_COOLDOWN_KEY = '3ook_tts_try_cooldown'

export function useTTSTryModal() {
  const { user } = useUserSession()

  const offerTTS = useStorage(TTS_TRY_OFFER_KEY, true)

  const offerCooldown = useStorage(TTS_TRY_COOLDOWN_KEY, Date.now())

  const isPlus = computed(() => user.value?.isLikerPlus || false)

  const shouldShowTTSTryModal = computed(() => {
    if (isPlus.value) {
      return false
    }

    return offerTTS.value && Date.now() > offerCooldown.value
  })

  function dismissTTSTryModal() {
    offerTTS.value = false
  }

  function snoozeTTSTryModal(durationMs: number) {
    offerCooldown.value = Date.now() + durationMs
  }

  function resetTTSTryOffer() {
    offerTTS.value = true
    offerCooldown.value = Date.now()
  }

  return {
    offerTTS,
    offerCooldown,
    shouldShowTTSTryModal,
    dismissTTSTryModal,
    snoozeTTSTryModal,
    resetTTSTryOffer,
  }
}
