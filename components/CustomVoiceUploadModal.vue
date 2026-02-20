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

        <div class="flex flex-col gap-2">
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
          class="text-sm text-muted"
          v-text="$t('tts_custom_voice_instructions')"
        />

        <p
          class="text-xs text-amber-600"
          v-text="$t('tts_custom_voice_authorization_warning')"
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

        <div class="flex flex-col gap-2">
          <label
            class="text-sm font-medium"
            v-text="$t('tts_custom_voice_audio_source_label')"
          />

          <div class="flex items-center gap-2">
            <UButton
              class="flex-1 min-w-0"
              variant="outline"
              :label="audioFile ? audioFile.name : $t('tts_custom_voice_upload_audio_button')"
              icon="i-material-symbols-audio-file-outline"
              :ui="{ label: 'truncate' }"
              @click="audioInputEl?.click()"
            />

            <template v-if="hasMicrophone">
              <UButton
                v-if="!isRecording"
                variant="outline"
                icon="i-material-symbols-mic"
                :label="$t('tts_custom_voice_record_button')"
                @click="startRecording"
              />
              <UButton
                v-else
                variant="solid"
                color="error"
                icon="i-material-symbols-stop-rounded"
                :label="formattedRecordingDuration"
                @click="stopRecording"
              />
            </template>
          </div>

          <input
            ref="audioInputEl"
            type="file"
            class="hidden"
            accept=".mp3,.wav,.m4a"
            @change="handleAudioChange"
          >
        </div>

        <div
          v-if="audioPreviewUrl"
          class="flex items-center gap-2 rounded-lg bg-(--ui-bg-muted) p-3"
        >
          <UButton
            size="sm"
            :icon="isPlayingPreview ? 'i-material-symbols-pause-rounded' : 'i-material-symbols-play-arrow-rounded'"
            variant="soft"
            @click="toggleAudioPreview"
          />
          <div class="flex-1 text-xs text-muted truncate">
            {{ audioFile?.name || $t('tts_custom_voice_recorded_audio_label') }}
          </div>
          <span
            class="text-xs tabular-nums"
            :class="isAudioDurationValid ? 'text-dimmed' : 'text-red-500 font-medium'"
          >
            {{ formattedAudioDuration }}
          </span>
          <UButton
            size="xs"
            icon="i-material-symbols-close"
            variant="ghost"
            color="neutral"
            @click="clearAudio"
          />
        </div>
        <p
          v-if="audioPreviewUrl && !isAudioDurationValid"
          class="text-xs text-red-500"
          v-text="$t('tts_custom_voice_error_audio_duration')"
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
          :disabled="!audioFile || isUploading || !isAudioDurationValid"
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
const voiceLanguage = ref(props.existingVoice?.voiceLanguage || 'zh-HK')
const audioFile = ref<File | null>(null)
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
const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingChunks = ref<Blob[]>([])
const recordingDuration = ref(0)
const recordingTimer = ref<ReturnType<typeof setInterval> | null>(null)

const audioPreviewUrl = ref<string | null>(null)
const audioPreviewEl = ref<HTMLAudioElement | null>(null)
const isPlayingPreview = ref(false)
const audioDuration = ref(0)

const MIN_AUDIO_DURATION = 10
const MAX_AUDIO_DURATION = 300
const isAudioDurationValid = computed(() => {
  if (!audioFile.value || audioDuration.value === 0) return true
  return audioDuration.value >= MIN_AUDIO_DURATION && audioDuration.value <= MAX_AUDIO_DURATION
})

const audioInputEl = useTemplateRef<HTMLInputElement>('audioInputEl')
const avatarInputEl = useTemplateRef<HTMLInputElement>('avatarInputEl')

const voiceLanguageOptions = [
  { label: '粵語', value: 'zh-HK' },
  { label: '國語', value: 'zh-TW' },
]

const activePreviewLanguages = computed(() => [
  voiceLanguage.value === 'zh-TW'
    ? { label: '國語', value: 'zh-TW' }
    : { label: '粵語', value: 'zh-HK' },
  { label: 'English', value: 'en-US' },
])

const PREVIEW_TEXT: Record<string, string> = {
  'zh-HK': '歡迎收聽，這是我的私人聲優。',
  'zh-TW': '歡迎收聽，這是我的私人聲優。',
  'en-US': 'Welcome, this is my private voice artist.',
}

const formattedRecordingDuration = computed(() => formatSeconds(recordingDuration.value))
const formattedAudioDuration = computed(() => formatSeconds(Math.round(audioDuration.value)))

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

onMounted(() => {
  hasMicrophone.value = !!navigator.mediaDevices?.getUserMedia
})

async function startRecording() {
  errorMessage.value = ''
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    recordingChunks.value = []
    recordingDuration.value = 0

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunks.value.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value)
        recordingTimer.value = null
      }
      const rawBlob = new Blob(recordingChunks.value, { type: recorder.mimeType })
      try {
        const wavBlob = await convertBlobToWav(rawBlob)
        const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })
        setAudioFile(file)
      }
      catch (error) {
        console.error('[CustomVoice] WAV conversion failed:', error)
        errorMessage.value = $t('tts_custom_voice_error_recording_failed')
      }
    }

    mediaRecorder.value = recorder
    recorder.start()
    isRecording.value = true
    recordingTimer.value = setInterval(() => {
      recordingDuration.value++
    }, 1000)
  }
  catch {
    errorMessage.value = $t('tts_custom_voice_error_mic_denied')
    hasMicrophone.value = false
  }
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  isRecording.value = false
}

function setAudioFile(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    errorMessage.value = $t('tts_custom_voice_error_audio_too_large')
    return
  }
  errorMessage.value = ''
  audioFile.value = file

  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
  stopAudioPreview()
  const url = URL.createObjectURL(file)
  audioPreviewUrl.value = url

  const audio = new Audio(url)
  audio.onloadedmetadata = () => {
    audioDuration.value = audio.duration
  }
}

function clearAudio() {
  stopAudioPreview()
  if (audioPreviewUrl.value) {
    URL.revokeObjectURL(audioPreviewUrl.value)
    audioPreviewUrl.value = null
  }
  audioFile.value = null
  audioDuration.value = 0
}

function toggleAudioPreview() {
  if (isPlayingPreview.value) {
    stopAudioPreview()
    return
  }
  if (!audioPreviewUrl.value) return

  const audio = new Audio(audioPreviewUrl.value)
  audioPreviewEl.value = audio
  isPlayingPreview.value = true
  audio.onended = () => {
    isPlayingPreview.value = false
  }
  audio.onerror = () => {
    isPlayingPreview.value = false
  }
  audio.play().catch(() => {
    isPlayingPreview.value = false
  })
}

function stopAudioPreview() {
  if (audioPreviewEl.value) {
    audioPreviewEl.value.pause()
    audioPreviewEl.value = null
  }
  isPlayingPreview.value = false
}

function handleAudioChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  setAudioFile(file)
  target.value = ''
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
  if (!audioFile.value) return
  errorMessage.value = ''

  try {
    const name = voiceName.value || $t('tts_custom_voice_default_name')
    const data = await uploadCustomVoice({
      audio: audioFile.value,
      voiceName: name,
      voiceLanguage: voiceLanguage.value,
      avatar: avatarFile.value || undefined,
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
  if (isRecording.value) stopRecording()
  if (audioPreviewUrl.value) URL.revokeObjectURL(audioPreviewUrl.value)
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  stopAudioPreview()
})
</script>
