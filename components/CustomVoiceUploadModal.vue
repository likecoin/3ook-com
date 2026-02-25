<template>
  <UModal
    :ui="{
      title: 'text-sm laptop:text-base font-bold text-center',
      body: 'flex flex-col gap-4 px-6 py-4',
      footer: 'flex flex-col items-center w-full gap-3',
    }"
    @update:open="onOpenUpdate"
  >
    <template #header>
      <span
        class="text-lg font-bold"
        v-text="$t('tts_custom_voice_modal_title')"
      />
      <UIcon
        name="i-material-symbols-close"
        class="text-dimmed cursor-pointer ml-auto hover:text-default"
        size="24"
        @click="emit('close')"
      />
    </template>

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
          <span class="text-base font-medium">{{ previewVoiceName }}</span>
        </div>

        <div
          v-if="voiceLanguageOptions.length > 1"
          class="flex flex-col gap-2"
        >
          <p
            class="text-sm font-medium text-muted"
            v-text="$t('tts_custom_voice_language_label')"
          />
          <URadioGroup
            :model-value="voiceLanguage"
            :items="voiceLanguageOptions"
            orientation="horizontal"
            @update:model-value="handleVoiceLanguageChange"
          />
        </div>

        <div class="flex flex-col gap-3">
          <p
            class="text-sm font-medium text-muted"
            v-text="$t('tts_custom_voice_preview_label')"
          />
          <div
            v-for="lang in activePreviewLanguages"
            :key="lang.value"
            class="flex flex-col gap-1"
          >
            <span class="text-xs text-dimmed">{{ lang.label }}</span>
            <audio
              controls
              preload="none"
              class="w-full h-8"
              :src="getTTSPreviewUrl(lang.value)"
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

        <div
          v-if="voiceLanguageOptions.length > 1"
          class="flex flex-col gap-2"
        >
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
            <blockquote class="border-l-2 border-gray-300 pl-3 text-sm text-muted italic">
              {{ locale === 'en' ? $t('tts_custom_voice_suggested_text_en') : $t('tts_custom_voice_suggested_text_zh') }}
            </blockquote>
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
          </label>
          <p
            class="text-xs text-dimmed"
            v-text="$t('tts_custom_voice_prompt_voice_description')"
          />

          <div class="flex flex-col gap-1">
            <p
              class="text-xs text-dimmed"
              v-text="$t('tts_custom_voice_prompt_text_label')"
            />
            <blockquote class="border-l-2 border-gray-300 pl-3 text-sm text-muted italic">
              {{ $t('tts_custom_voice_prompt_text') }}
            </blockquote>
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

    <template #footer>
      <template v-if="showDeleteConfirm">
        <p
          class="text-sm text-center text-muted"
          v-text="$t('tts_custom_voice_delete_confirm_description')"
        />
        <UButton
          class="w-full"
          :label="$t('tts_custom_voice_delete_confirm_title')"
          block
          size="xl"
          color="error"
          @click="confirmDelete"
        />
        <UButton
          :label="$t('tts_custom_voice_done_button')"
          block
          size="xl"
          variant="link"
          @click="showDeleteConfirm = false"
        />
      </template>
      <template v-else-if="showPreview">
        <UButton
          v-if="!uploadSuccess"
          class="w-full"
          :label="$t('tts_custom_voice_replace_button')"
          block
          size="xl"
          variant="outline"
          @click="showUploadForm = true"
        />
        <UButton
          v-if="!uploadSuccess"
          :label="$t('tts_custom_voice_delete_button')"
          block
          size="xl"
          variant="link"
          color="error"
          @click="handleDelete"
        />
        <UButton
          class="w-full"
          :label="$t('tts_custom_voice_done_button')"
          block
          size="xl"
          @click="emit('close')"
        />
      </template>
      <template v-else>
        <p
          v-if="existingVoice"
          class="text-xs text-amber-600"
          v-text="$t('tts_custom_voice_replace_warning')"
        />
        <UButton
          class="w-full"
          :label="existingVoice ? $t('tts_custom_voice_replace_button') : $t('tts_custom_voice_upload_button')"
          block
          size="xl"
          :loading="isUploading"
          :disabled="!mainAudio.file.value || !promptAudio.file.value || isUploading || !isAudioDurationValid || !isPromptAudioDurationValid"
          @click="handleUpload"
        />
        <UButton
          v-if="existingVoice"
          :label="$t('tts_custom_voice_delete_button')"
          block
          size="xl"
          variant="link"
          color="error"
          @click="handleDelete"
        />
      </template>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { CustomVoiceData } from '~/shared/types/custom-voice'
import customDefaultAvatar from '@/assets/images/voice-avatars/custom-default.jpg'

const props = defineProps<{
  existingVoice?: CustomVoiceData | null
}>()

const emit = defineEmits<{
  close: []
  uploaded: [voice: CustomVoiceData]
  deleted: []
}>()

const { t: $t, locale } = useI18n()
const { isUploading, uploadCustomVoice, updateVoiceLanguage, removeCustomVoice } = useCustomVoice()

const voiceName = ref(props.existingVoice?.voiceName || '')
const voiceLanguage = ref(props.existingVoice?.voiceLanguage || (locale.value === 'en' ? 'en-US' : 'zh-HK'))
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const errorMessage = ref('')
const uploadSuccess = ref(false)
const showDeleteConfirm = ref(false)
const showUploadForm = ref(!props.existingVoice)
const previewCacheBuster = ref(Date.now())

const showPreview = computed(() => uploadSuccess.value || (!!props.existingVoice && !showUploadForm.value))
const previewVoiceName = computed(() => voiceName.value || props.existingVoice?.voiceName || '')
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

const voiceLanguageOptions = computed(() =>
  locale.value === 'en'
    ? [{ label: 'English', value: 'en-US' }]
    : [
        { label: '粵語', value: 'zh-HK' },
        { label: '國語', value: 'zh-TW' },
      ],
)

const activePreviewLanguages = computed((): { label: string, value: string }[] => {
  const primary = voiceLanguageOptions.value.find(o => o.value === voiceLanguage.value)
    ?? voiceLanguageOptions.value[0]
    ?? { label: voiceLanguage.value, value: voiceLanguage.value }
  if (voiceLanguage.value === 'en-US') {
    return [primary]
  }
  return [primary, { label: 'English', value: 'en-US' }]
})

const PREVIEW_TEXT: Record<string, string> = {
  'zh-HK': '歡迎收聽，這是我的私人聲優。',
  'zh-TW': '歡迎收聽，這是我的私人聲優。',
  'en-US': 'Welcome, this is my private voice artist.',
}

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
  promptTextSnapshot.value = file ? $t('tts_custom_voice_prompt_text') : ''
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

async function handleVoiceLanguageChange(value: string) {
  voiceLanguage.value = value
  if (props.existingVoice && !showUploadForm.value) {
    try {
      await updateVoiceLanguage(value)
    }
    catch (error) {
      console.error('[CustomVoice] Failed to update language:', error)
    }
  }
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
      emit('uploaded', data)
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    errorMessage.value = message
    console.error('[CustomVoice] Upload failed:', error)
  }
}

function handleDelete() {
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  showDeleteConfirm.value = false
  try {
    await removeCustomVoice()
    emit('deleted')
    emit('close')
  }
  catch (error) {
    console.error('[CustomVoice] Delete failed:', error)
  }
}

function getTTSPreviewUrl(language: string): string {
  const text = PREVIEW_TEXT[language] || PREVIEW_TEXT['zh-HK'] || ''
  const params = new URLSearchParams({
    text,
    language,
    voice_id: 'custom',
    _t: previewCacheBuster.value.toString(),
  })
  return `/api/reader/tts?${params.toString()}`
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
