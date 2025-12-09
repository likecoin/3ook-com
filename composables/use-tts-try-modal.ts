import { useStorage } from '@vueuse/core'
import { TTSTryModal } from '#components'

const TTS_TRY_MODAL_KEY = '3ook_tts_try_modal'

interface TTSTryModalState {
  shouldOffer: boolean
  cooldownUntil: number
}

export function useTTSTryModal() {
  const { user } = useUserSession()
  const overlay = useOverlay()

  const state = useStorage<TTSTryModalState>(TTS_TRY_MODAL_KEY, {
    shouldOffer: true,
    cooldownUntil: Date.now(),
  })

  const isPlus = computed(() => user.value?.isLikerPlus || false)

  const shouldShowTTSTryModal = computed(() => {
    if (isPlus.value) {
      return false
    }

    return state.value.shouldOffer && Date.now() > state.value.cooldownUntil
  })

  function dismissTTSTryModal() {
    state.value.shouldOffer = false
  }

  function snoozeTTSTryModal() {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000
    state.value.cooldownUntil = Date.now() + oneWeekInMs
  }

  function resetTTSTryOffer() {
    state.value = {
      shouldOffer: true,
      cooldownUntil: Date.now(),
    }
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
    shouldShowTTSTryModal,
    dismissTTSTryModal,
    snoozeTTSTryModal,
    resetTTSTryOffer,
    showTTSTryModal,
  }
}
