import { useStorage } from '@vueuse/core'
import { TTSTryModal } from '#components'

const TTS_TRY_OFFER_KEY = '3ook_tts_try_offer'
const TTS_TRY_COOLDOWN_KEY = '3ook_tts_try_cooldown'

export function useTTSTryModal() {
  const { user } = useUserSession()
  const overlay = useOverlay()

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

  function snoozeTTSTryModal() {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000
    offerCooldown.value = Date.now() + oneWeekInMs
  }

  function resetTTSTryOffer() {
    hasTTSTrialOffered.value = true
    offerCooldown.value = Date.now()
  }

  function showTTSTryModal(options: {
    nftClassId: string
    onVoiceSelected?: (languageVoice: string) => void
  }) {
    const modal = overlay.create(TTSTryModal, {
      props: {
        nftClassId: options.nftClassId,
        onVoiceSelected: (languageVoice: string) => {
          dismissTTSTryModal()
          useLogEvent('tts_try_voice_selected', {
            nft_class_id: options.nftClassId,
            languageVoice,
          })
          modal.close()
          options.onVoiceSelected?.(languageVoice)
        },
        onSnooze: () => {
          snoozeTTSTryModal()
          useLogEvent('tts_try_snoozed', {
            nft_class_id: options.nftClassId,
          })
          modal.close()
        },
        onDismiss: () => {
          dismissTTSTryModal()
          useLogEvent('tts_try_dismissed', {
            nft_class_id: options.nftClassId,
          })
          modal.close()
        },
      },
    })

    modal.open()
  }

  return {
    hasTTSTrialOffered,
    offerCooldown,
    shouldShowTTSTryModal,
    dismissTTSTryModal,
    snoozeTTSTryModal,
    resetTTSTryOffer,
    showTTSTryModal,
  }
}
