<template>
  <UModal
    :title="$t('tts_custom_voice_modal_title')"
    :ui="{
      content: 'pb-safe',
      body: 'flex flex-col gap-4',
      footer: 'flex flex-col items-center gap-3 w-full',
    }"
    :fullscreen="!isDesktopScreen"
    :dismissible="!(isLoading || isAnyRecording || hasAnyRecordingFile)"
    :close="!(isLoading || isAnyRecording)"
    @update:open="onOpenUpdate"
  >
    <template #body>
      <template v-if="showPreview">
        <div
          v-if="uploadSuccess"
          class="flex flex-col items-center gap-3"
        >
          <UIcon
            name="i-material-symbols-check-circle-rounded"
            class="text-green-500"
            size="48"
          />
          <p
            class="text-center text-base font-semibold"
            v-text="$t('tts_custom_voice_success')"
          />
        </div>

        <div class="flex items-center gap-3">
          <UAvatar
            size="lg"
            :src="previewAvatarUrl || customDefaultAvatar"
          />
          <UInput
            v-model="previewVoiceNameInput"
            class="flex-1"
            :maxlength="100"
            :placeholder="$t('tts_custom_voice_default_name')"
            :loading="isLoading"
            :disabled="isLoading"
            @blur="handleVoiceNameBlur"
          />
        </div>

        <div class="flex flex-col gap-1">
          <p
            class="text-sm font-medium text-muted"
            v-text="$t('tts_custom_voice_language_label')"
          />
          <p
            class="text-sm"
            v-text="voiceLanguageLabel"
          />
        </div>

        <div class="flex flex-col gap-2">
          <p
            class="text-sm font-medium text-muted"
            v-text="$t('tts_custom_voice_preview_label')"
          />
          <UTextarea
            v-model="previewText"
            class="w-full"
            :placeholder="$t('tts_custom_voice_preview_text_placeholder')"
            :rows="3"
            :maxlength="PREVIEW_MAX_LENGTH"
            autoresize
          />
          <p
            class="text-xs text-dimmed text-right tabular-nums"
            v-text="`${previewText.length} / ${PREVIEW_MAX_LENGTH}`"
          />
          <div
            v-if="previewAudioSrc"
            class="flex items-center gap-2"
          >
            <audio
              controls
              preload="none"
              class="flex-1 w-full min-w-0 h-8"
              :src="previewAudioSrc"
            />
            <UButton
              icon="i-material-symbols-download-rounded"
              variant="outline"
              :label="$t('tts_custom_voice_preview_download_button')"
              :loading="isDownloadingPreview"
              @click="handleDownloadPreview"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <p
          class="text-xs text-amber-600"
          v-text="$t('tts_custom_voice_authorization_warning')"
        />

        <div class="flex items-center gap-3">
          <UAvatar
            size="lg"
            :src="avatarPreview || customDefaultAvatar"
            class="shrink-0 cursor-pointer"
            @click="avatarInputEl?.click()"
          />
          <UInput
            v-model="voiceName"
            class="flex-1"
            :placeholder="$t('tts_custom_voice_default_name')"
          />
          <input
            ref="avatarInputEl"
            type="file"
            class="hidden"
            accept="image/jpeg,image/png"
            @change="handleAvatarChange"
          >
        </div>

        <div class="flex flex-col gap-2">
          <p
            class="text-sm font-medium text-muted"
            v-text="$t('tts_custom_voice_language_label')"
          />
          <URadioGroup
            v-model="voiceLanguage"
            :items="voiceLanguageOptions"
            orientation="horizontal"
          />
        </div>

        <!-- Step 1: Main voice sample -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            1. {{ $t('tts_custom_voice_audio_source_label') }}
            <span class="text-red-500 font-normal">*</span>
          </label>
          <p
            class="text-xs text-muted"
            v-text="$t('tts_custom_voice_instructions')"
          />

          <div class="flex flex-col gap-1">
            <p
              class="text-xs text-dimmed"
              v-text="$t('tts_custom_voice_suggested_text_label')"
            />
            <blockquote
              class="border-l-2 pl-3 text-sm text-muted italic border-muted"
              v-text="suggestedReadingText"
            />
          </div>

          <div class="flex items-center gap-2">
            <UButton
              class="flex-1 min-w-0"
              variant="outline"
              :label="mainAudio.file.value ? mainAudio.file.value.name : $t('tts_custom_voice_upload_audio_button')"
              icon="i-material-symbols-audio-file-outline"
              :ui="{ label: 'truncate' }"
              @click="audioInputEl?.click()"
            />

            <template v-if="hasMicrophone">
              <UButton
                v-if="!mainAudio.isRecording.value"
                variant="outline"
                icon="i-material-symbols-mic"
                :label="$t('tts_custom_voice_record_button')"
                :disabled="isAnyRecording"
                @click="startMainRecording"
              />
              <UButton
                v-else
                variant="solid"
                color="error"
                icon="i-material-symbols-stop-rounded"
                :label="mainAudio.formattedRecordingDuration.value"
                @click="mainAudio.stopRecording()"
              />
            </template>
          </div>

          <input
            ref="audioInputEl"
            type="file"
            class="hidden"
            accept=".mp3,.wav,.m4a"
            @change="mainAudio.handleFileChange"
          >

          <div
            v-if="mainAudio.previewUrl.value"
            class="flex items-center gap-2 rounded-lg bg-(--ui-bg-muted) p-3"
          >
            <UButton
              size="sm"
              :icon="mainPreview.isPlaying.value ? 'i-material-symbols-pause-rounded' : 'i-material-symbols-play-arrow-rounded'"
              variant="soft"
              @click="mainPreview.toggle"
            />
            <div class="flex-1 text-xs text-muted truncate">
              {{ mainAudio.file.value?.name || $t('tts_custom_voice_recorded_audio_label') }}
            </div>
            <span
              class="text-xs tabular-nums"
              :class="isAudioDurationValid ? 'text-dimmed' : 'text-red-500 font-medium'"
            >
              {{ mainAudio.formattedDuration.value }}
            </span>
            <UButton
              size="xs"
              icon="i-material-symbols-close"
              variant="ghost"
              color="neutral"
              @click="clearMainAudio"
            />
          </div>
          <p
            v-if="mainAudio.previewUrl.value && !isAudioDurationValid"
            class="text-xs text-red-500"
            v-text="$t('tts_custom_voice_error_audio_duration')"
          />
        </div>

        <!-- Step 2: Prompt voice -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            2. {{ $t('tts_custom_voice_prompt_voice_label') }}
            <span class="text-dimmed font-normal">({{ $t('tts_custom_voice_optional') }})</span>
          </label>
          <p
            class="text-xs text-dimmed"
            v-text="$t('tts_custom_voice_prompt_voice_description')"
          />
          <p
            class="text-xs text-amber-600"
            v-text="$t('tts_custom_voice_prompt_voice_recommendation')"
          />

          <div class="flex flex-col gap-1">
            <p
              class="text-xs text-dimmed"
              v-text="$t('tts_custom_voice_prompt_text_label')"
            />
            <blockquote
              class="border-l-2 pl-3 text-sm text-muted italic border-muted"
              v-text="promptReadingText"
            />
          </div>

          <div class="flex items-center gap-2">
            <UButton
              class="flex-1 min-w-0"
              variant="outline"
              :label="promptAudio.file.value ? promptAudio.file.value.name : $t('tts_custom_voice_prompt_audio_button')"
              icon="i-material-symbols-audio-file-outline"
              :ui="{ label: 'truncate' }"
              @click="promptAudioInputEl?.click()"
            />

            <template v-if="hasMicrophone">
              <UButton
                v-if="!promptAudio.isRecording.value"
                variant="outline"
                icon="i-material-symbols-mic"
                :label="$t('tts_custom_voice_record_button')"
                :disabled="isAnyRecording"
                @click="startPromptRecording"
              />
              <UButton
                v-else
                variant="solid"
                color="error"
                icon="i-material-symbols-stop-rounded"
                :label="promptAudio.formattedRecordingDuration.value"
                @click="promptAudio.stopRecording()"
              />
            </template>
          </div>

          <input
            ref="promptAudioInputEl"
            type="file"
            class="hidden"
            accept=".mp3,.wav,.m4a"
            @change="promptAudio.handleFileChange"
          >

          <div
            v-if="promptAudio.previewUrl.value"
            class="flex items-center gap-2 rounded-lg bg-(--ui-bg-muted) p-3"
          >
            <UButton
              size="sm"
              :icon="promptPreview.isPlaying.value ? 'i-material-symbols-pause-rounded' : 'i-material-symbols-play-arrow-rounded'"
              variant="soft"
              @click="promptPreview.toggle"
            />
            <div class="flex-1 text-xs text-muted truncate">
              {{ promptAudio.file.value?.name || $t('tts_custom_voice_recorded_audio_label') }}
            </div>
            <span
              class="text-xs tabular-nums shrink-0"
              :class="isPromptAudioDurationValid ? 'text-dimmed' : 'text-red-500 font-medium'"
            >
              {{ promptAudio.formattedDuration.value }}
            </span>
            <UButton
              size="xs"
              icon="i-material-symbols-close"
              variant="ghost"
              color="neutral"
              @click="clearPromptAudio"
            />
          </div>
          <p
            v-if="promptAudio.previewUrl.value && !isPromptAudioDurationValid"
            class="text-xs text-red-500"
            v-text="$t('tts_custom_voice_error_prompt_audio_duration')"
          />
        </div>

        <p
          v-if="errorMessage"
          class="text-xs text-red-500"
          v-text="errorMessage"
        />
      </template>
    </template>

    <template
      v-if="!uploadSuccess || !showPreview"
      #footer
    >
      <template v-if="showPreview">
        <div
          v-if="!uploadSuccess"
          class="flex gap-[inherit] w-full max-w-lg"
        >
          <UButton
            :label="$t('tts_custom_voice_delete_button')"
            block
            size="xl"
            variant="outline"
            color="error"
            :disabled="isLoading"
            @click="handleDelete"
          />
          <UButton
            class="w-full"
            :label="$t('tts_custom_voice_replace_button')"
            block
            size="xl"
            variant="outline"
            :disabled="isLoading"
            @click="handleReplace"
          />
        </div>
      </template>
      <template v-else>
        <p
          v-if="existingVoice"
          class="text-xs text-amber-600"
          v-text="$t('tts_custom_voice_replace_warning')"
        />
        <div class="flex gap-[inherit] w-full max-w-lg">
          <UButton
            v-if="existingVoice"
            :label="$t('tts_custom_voice_delete_button')"
            block
            size="xl"
            variant="outline"
            color="error"
            :disabled="isLoading"
            @click="handleDelete"
          />
          <UButton
            class="w-full"
            :label="existingVoice ? $t('tts_custom_voice_replace_button') : $t('tts_custom_voice_upload_button')"
            block
            size="xl"
            variant="outline"
            :loading="isLoading"
            :disabled="!mainAudio.file.value || isLoading || !isAudioDurationValid || !isPromptAudioDurationValid"
            @click="handleUpload"
          />
        </div>
      </template>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CustomVoiceData } from '~/shared/types/custom-voice'
import { computeTTSTextSig, TTS_PREVIEW_NFT_CLASS_ID } from '~/shared/utils/tts-sig'
import customDefaultAvatar from '@/assets/images/voice-avatars/custom-default.jpg'

const props = defineProps<{
  existingVoice?: CustomVoiceData | null
}>()

const emit = defineEmits<{
  close: []
  uploaded: [voice: CustomVoiceData]
  deleted: []
}>()

const { t: $t } = useI18n()
const { user: sessionUser } = useUserSession()
const { customVoice, isLoading, uploadCustomVoice, updateCustomVoiceInfo, removeCustomVoice } = useCustomVoice()
const isDesktopScreen = useDesktopScreen()
const baseModal = useBaseModal()

const voiceName = ref(props.existingVoice?.voiceName || '')
const voiceLanguage = ref(props.existingVoice?.voiceLanguage || 'zh-HK')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const errorMessage = ref('')
const uploadSuccess = ref(false)
const showUploadForm = ref(!props.existingVoice)
const previewCacheBuster = ref(Date.now())

const showPreview = computed(() => uploadSuccess.value || (!!props.existingVoice && !showUploadForm.value))
const previewVoiceNameInput = ref(props.existingVoice?.voiceName || '')
const { getResizedImageURL } = useImageResize()
const previewAvatarUrl = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  const raw = props.existingVoice?.avatarUrl
  return raw ? getResizedImageURL(raw, { size: 128 }) : null
})

const hasMicrophone = ref(false)

function setError(key: string) {
  errorMessage.value = $t(key)
}
function clearError() {
  errorMessage.value = ''
}

const mainAudio = useAudioRecorder({ onError: setError, onClearError: clearError })
const promptAudio = useAudioRecorder({ maxFileSize: 2 * 1024 * 1024, fileTooLargeErrorKey: 'tts_custom_voice_error_prompt_audio_too_large', onError: setError, onClearError: clearError })

const isAnyRecording = computed(() => mainAudio.isRecording.value || promptAudio.isRecording.value)
const hasAnyRecordingFile = computed(() => !!mainAudio.file.value || !!promptAudio.file.value)

function createPreviewPlayer(getUrl: () => string | null) {
  const el = ref<HTMLAudioElement | null>(null)
  const isPlaying = ref(false)

  function stop() {
    if (el.value) {
      el.value.pause()
      el.value.onended = null
      el.value.onerror = null
      el.value = null
    }
    isPlaying.value = false
  }

  function toggle() {
    if (isPlaying.value) {
      stop()
      return
    }
    const url = getUrl()
    if (!url) return

    stop()
    const audio = new Audio(url)
    el.value = audio
    isPlaying.value = true
    audio.onended = () => {
      isPlaying.value = false
    }
    audio.onerror = () => {
      isPlaying.value = false
    }
    audio.play().catch(() => {
      isPlaying.value = false
    })
  }

  return { isPlaying, toggle, stop }
}

const mainPreview = createPreviewPlayer(() => mainAudio.previewUrl.value)
const promptPreview = createPreviewPlayer(() => promptAudio.previewUrl.value)

const MIN_AUDIO_DURATION = 10
const MAX_AUDIO_DURATION = 300
const isAudioDurationValid = computed(() => {
  if (!mainAudio.file.value || mainAudio.duration.value === 0) return true
  return mainAudio.duration.value >= MIN_AUDIO_DURATION && mainAudio.duration.value <= MAX_AUDIO_DURATION
})

const MIN_PROMPT_AUDIO_DURATION = 1
const MAX_PROMPT_AUDIO_DURATION = 8
const isPromptAudioDurationValid = computed(() => {
  if (!promptAudio.file.value || promptAudio.duration.value === 0) return true
  return promptAudio.duration.value >= MIN_PROMPT_AUDIO_DURATION && promptAudio.duration.value <= MAX_PROMPT_AUDIO_DURATION
})

const audioInputEl = useTemplateRef<HTMLInputElement>('audioInputEl')
const avatarInputEl = useTemplateRef<HTMLInputElement>('avatarInputEl')
const promptAudioInputEl = useTemplateRef<HTMLInputElement>('promptAudioInputEl')

const voiceLanguageOptions = computed(() => [
  { label: $t('tts_custom_voice_language_option_cantonese'), value: 'zh-HK' },
  { label: $t('tts_custom_voice_language_option_mandarin'), value: 'zh-TW' },
])

const PREVIEW_TEXT = '歡迎收聽，這是我的私人聲優。'
const SUGGESTED_READING_TEXT = '其實我一直覺得，閱讀是一件很浪漫的事。不管是手捧著實體書，還是滑著電子螢幕，只要沉浸在故事裡，就能暫時忘掉現實的煩惱，去到一個完全不同的時空。'
const PROMPT_READING_TEXT = '在未來的世界裡，科技與生活將會深度融合。'

// Preserved for legacy users whose existing custom voice is in English
const PREVIEW_TEXT_EN = 'Welcome, this is my private voice artist.'
const SUGGESTED_READING_TEXT_EN = 'I\'ve always felt that reading is something truly romantic. Whether you\'re holding a physical book or scrolling on a screen, as long as you\'re immersed in a story, you can briefly forget your worries and travel to an entirely different world.'
const PROMPT_READING_TEXT_EN = 'In the world of the future, technology and daily life will be deeply intertwined.'

const isLegacyEnglishVoice = computed(() => voiceLanguage.value === 'en-US')
const suggestedReadingText = computed(() => isLegacyEnglishVoice.value ? SUGGESTED_READING_TEXT_EN : SUGGESTED_READING_TEXT)
const promptReadingText = computed(() => isLegacyEnglishVoice.value ? PROMPT_READING_TEXT_EN : PROMPT_READING_TEXT)
const voiceLanguageLabel = computed(() => {
  if (isLegacyEnglishVoice.value) return $t('tts_custom_voice_language_option_english')
  return voiceLanguageOptions.value.find(option => option.value === voiceLanguage.value)?.label || ''
})

const PREVIEW_MAX_LENGTH = 2000
const previewText = ref(isLegacyEnglishVoice.value ? PREVIEW_TEXT_EN : PREVIEW_TEXT)
const isDownloadingPreview = ref(false)

const previewAudioSrc = computed(() => {
  const text = previewText.value.trim()
  if (!text) return ''
  return getTTSPreviewUrl(voiceLanguage.value, text)
})

watch(voiceLanguage, (newLang, oldLang) => {
  // Preserve any text the user typed themselves; only swap when the textarea
  // still holds the previous language's default phrase (or is empty).
  const oldDefault = oldLang === 'en-US' ? PREVIEW_TEXT_EN : PREVIEW_TEXT
  const newDefault = newLang === 'en-US' ? PREVIEW_TEXT_EN : PREVIEW_TEXT
  if (previewText.value.trim() === '' || previewText.value === oldDefault) {
    previewText.value = newDefault
  }
})

onMounted(() => {
  hasMicrophone.value = !!navigator.mediaDevices?.getUserMedia
  if (hasMicrophone.value) import('@breezystack/lamejs')
})

async function startMainRecording() {
  errorMessage.value = ''
  try {
    await mainAudio.startRecording()
  }
  catch {
    hasMicrophone.value = false
  }
}

async function startPromptRecording() {
  errorMessage.value = ''
  try {
    await promptAudio.startRecording()
  }
  catch {
    hasMicrophone.value = false
  }
}

const promptTextSnapshot = ref('')
watch(() => promptAudio.file.value, (file) => {
  promptTextSnapshot.value = file ? promptReadingText.value : ''
})

function clearMainAudio() {
  mainPreview.stop()
  mainAudio.clear()
}

function clearPromptAudio() {
  promptPreview.stop()
  promptAudio.clear()
}

async function handleAvatarChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    errorMessage.value = $t('tts_custom_voice_error_avatar_too_large')
    return
  }
  errorMessage.value = ''
  try {
    const resizedFile = await resizeImageFile(file, 256)
    avatarFile.value = resizedFile
    avatarPreview.value = URL.createObjectURL(avatarFile.value)
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message
    console.error('[CustomVoice] Avatar resize failed:', error)
  }
}

async function handleVoiceNameBlur() {
  const newName = previewVoiceNameInput.value.trim()
  previewVoiceNameInput.value = newName
  if (!newName) return
  if ((!props.existingVoice || showUploadForm.value) && !uploadSuccess.value) return
  if (newName === customVoice.value?.voiceName) return
  try {
    await updateCustomVoiceInfo({ voiceName: newName })
  }
  catch (error) {
    previewVoiceNameInput.value = customVoice.value?.voiceName || props.existingVoice?.voiceName || ''
    console.error('[CustomVoice] Failed to update name:', error)
  }
}

function handleReplace() {
  if (isLegacyEnglishVoice.value) {
    voiceLanguage.value = 'zh-HK'
  }
  showUploadForm.value = true
}

async function handleUpload() {
  if (!mainAudio.file.value) return
  errorMessage.value = ''

  try {
    const name = voiceName.value || $t('tts_custom_voice_default_name')
    const data = await uploadCustomVoice({
      audio: mainAudio.file.value,
      voiceName: name,
      voiceLanguage: voiceLanguage.value,
      avatar: avatarFile.value || undefined,
      promptAudio: promptAudio.file.value || undefined,
      promptText: promptTextSnapshot.value || undefined,
    })
    if (data) {
      uploadSuccess.value = true
      previewCacheBuster.value = Date.now()
      previewVoiceNameInput.value = data.voiceName
      emit('uploaded', data)
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message
    console.error('[CustomVoice] Upload failed:', error)
  }
}

async function handleDelete() {
  const isConfirmed = await baseModal.open({
    title: $t('tts_custom_voice_delete_confirm_title'),
    description: $t('tts_custom_voice_delete_confirm_description'),
    actions: [
      {
        label: $t('common_delete'),
        color: 'error',
        result: true,
      },
      {
        label: $t('common_cancel'),
        variant: 'outline',
        result: false,
      },
    ],
  }).result
  if (!isConfirmed) return

  try {
    await removeCustomVoice()
    emit('deleted')
    emit('close')
  }
  catch (error) {
    console.error('[CustomVoice] Delete failed:', error)
  }
}

function getTTSPreviewUrl(language: string, text: string): string {
  const ttsKey = sessionUser.value?.ttsKey || ''
  const params = new URLSearchParams({
    text,
    language,
    voice_id: 'custom',
    nft_class_id: TTS_PREVIEW_NFT_CLASS_ID,
    sig: computeTTSTextSig({ token: ttsKey, voiceId: 'custom', language, nftClassId: TTS_PREVIEW_NFT_CLASS_ID, text }),
    _t: previewCacheBuster.value.toString(),
  })
  return `/api/reader/tts?${params.toString()}`
}

async function handleDownloadPreview() {
  const url = previewAudioSrc.value
  if (!url || isDownloadingPreview.value) return
  isDownloadingPreview.value = true
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const rawName = customVoice.value?.voiceName || props.existingVoice?.voiceName || $t('tts_custom_voice_default_name')
    const safeName = rawName.replace(/[^\p{L}\p{N}\-_]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'voice'
    await saveAs(blob, `${safeName}-${voiceLanguage.value}-${Date.now()}.mp3`)
  }
  catch (error: unknown) {
    console.error('[CustomVoice] Preview download failed:', error)
    errorMessage.value = $t('tts_custom_voice_preview_download_error')
  }
  finally {
    isDownloadingPreview.value = false
  }
}

function onOpenUpdate(open: boolean) {
  if (!open) {
    emit('close')
  }
}

onUnmounted(() => {
  mainAudio.cleanup()
  promptAudio.cleanup()
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  mainPreview.stop()
  promptPreview.stop()
})
</script>
