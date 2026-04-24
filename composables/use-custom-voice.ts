import type { CustomVoiceData } from '~/shared/types/custom-voice'

let inflightFetch: Promise<void> | null = null

export function useCustomVoice() {
  const customVoice = useState<CustomVoiceData | null>('custom-voice', () => null)
  const isLoaded = useState<boolean>('custom-voice-loaded', () => false)
  const isLoading = useState<boolean>('custom-voice-loading', () => false)

  const { loggedIn: hasLoggedIn } = useUserSession()

  const hasCustomVoice = computed(() => !!customVoice.value?.voiceId)

  function fetchCustomVoice(): Promise<void> {
    if (import.meta.server || isLoaded.value) {
      return Promise.resolve()
    }
    if (inflightFetch) return inflightFetch
    const task = (async () => {
      try {
        const data = await $fetch<CustomVoiceData | null>('/api/user/custom-voice')
        if (!hasLoggedIn.value) return
        customVoice.value = data
        isLoaded.value = true
      }
      catch (error) {
        console.error('[CustomVoice] Failed to fetch:', error)
      }
      finally {
        inflightFetch = null
      }
    })()
    inflightFetch = task
    return task
  }

  watch(hasLoggedIn, (loggedIn, wasLoggedIn) => {
    if (!loggedIn && wasLoggedIn) {
      customVoice.value = null
      isLoaded.value = false
      inflightFetch = null
    }
  })

  async function uploadCustomVoice(params: { audio: File, voiceName: string, voiceLanguage?: string, avatar?: File, promptAudio?: File, promptText?: string }) {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const formData = new FormData()
      formData.append('audio', params.audio)
      formData.append('voiceName', params.voiceName)
      if (params.voiceLanguage) {
        formData.append('voiceLanguage', params.voiceLanguage)
      }
      if (params.avatar) {
        formData.append('avatar', params.avatar)
      }
      if (params.promptAudio) {
        formData.append('promptAudio', params.promptAudio)
      }
      if (params.promptText) {
        formData.append('promptText', params.promptText)
      }
      const data = await $fetch<CustomVoiceData>('/api/user/custom-voice', {
        method: 'POST',
        body: formData,
      })
      customVoice.value = data
      isLoaded.value = true
      return data
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateCustomVoiceInfo(fields: { voiceName?: string, voiceLanguage?: string }) {
    if (isLoading.value) return
    isLoading.value = true
    try {
      await $fetch('/api/user/custom-voice', {
        method: 'PATCH',
        body: fields,
      })
      if (customVoice.value) {
        customVoice.value = { ...customVoice.value, ...fields }
      }
    }
    finally {
      isLoading.value = false
    }
  }

  async function removeCustomVoice() {
    if (isLoading.value) return
    isLoading.value = true
    try {
      await $fetch('/api/user/custom-voice', { method: 'DELETE' })
      customVoice.value = null
      isLoaded.value = true
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    customVoice,
    hasCustomVoice,
    isLoading,
    fetchCustomVoice,
    uploadCustomVoice,
    updateCustomVoiceInfo,
    removeCustomVoice,
  }
}
