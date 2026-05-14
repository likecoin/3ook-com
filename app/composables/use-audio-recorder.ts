const PREFERRED_MIME_TYPES = [
  'audio/mp4',
  'audio/mpeg',
]

const PASSTHROUGH_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
])

const MIME_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
}

function getRecorderMimeType(): string | undefined {
  return PREFERRED_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t))
}

export function useAudioRecorder(options: {
  maxFileSize?: number
  fileTooLargeErrorKey?: string
  onError: (i18nKey: string) => void
  onClearError?: () => void
}) {
  const maxFileSize = options.maxFileSize ?? 20 * 1024 * 1024
  const fileTooLargeErrorKey = options.fileTooLargeErrorKey ?? 'tts_custom_voice_error_audio_too_large'

  const file = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const duration = ref(0)

  const isRecording = ref(false)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const recordingDuration = ref(0)
  const { pause: pauseTimer, resume: resumeTimer } = useIntervalFn(() => {
    recordingDuration.value++
  }, 1000, { immediate: false })

  const formattedDuration = computed(() => formatSecondsMMSS(Math.round(duration.value)))
  const formattedRecordingDuration = computed(() => formatSecondsMMSS(recordingDuration.value))

  function setFile(newFile: File) {
    if (newFile.size > maxFileSize) {
      options.onError(fileTooLargeErrorKey)
      return
    }
    options.onClearError?.()
    file.value = newFile

    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    const url = URL.createObjectURL(newFile)
    previewUrl.value = url

    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      duration.value = audio.duration
    }
  }

  function clear() {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
    file.value = null
    duration.value = 0
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = getRecorderMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const recordingChunks: Blob[] = []
      recordingDuration.value = 0

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunks.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        pauseTimer()

        const rawMime = recorder.mimeType.split(';')[0]!
        const rawBlob = new Blob(recordingChunks, { type: rawMime })

        try {
          if (PASSTHROUGH_TYPES.has(rawMime)) {
            const ext = MIME_EXT[rawMime] || 'mp3'
            setFile(new File([rawBlob], `recording.${ext}`, { type: rawMime }))
          }
          else {
            const mp3Blob = await convertBlobToMp3(rawBlob)
            setFile(new File([mp3Blob], 'recording.mp3', { type: 'audio/mpeg' }))
          }
        }
        catch (error) {
          console.error('[AudioRecorder] MP3 conversion failed:', error)
          options.onError('tts_custom_voice_error_recording_failed')
        }
      }

      mediaRecorder.value = recorder
      recorder.start()
      isRecording.value = true
      resumeTimer()
    }
    catch {
      options.onError('tts_custom_voice_error_mic_denied')
      throw new Error('MIC_DENIED')
    }
  }

  function stopRecording() {
    if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
      mediaRecorder.value.stop()
    }
    isRecording.value = false
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    const selected = target.files?.[0]
    if (!selected) return
    setFile(selected)
    target.value = ''
  }

  function cleanup() {
    if (isRecording.value) stopRecording()
    clear()
  }

  return {
    file,
    previewUrl,
    duration,
    isRecording,
    recordingDuration,
    formattedDuration,
    formattedRecordingDuration,
    setFile,
    clear,
    startRecording,
    stopRecording,
    handleFileChange,
    cleanup,
  }
}

function formatSecondsMMSS(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
