<template>
  <UModal
    :ui="{
      title: 'text-sm laptop:text-base font-bold text-center',
      footer: 'flex flex-col items-center w-full gap-3',
      body: 'flex flex-col items-center gap-4 px-6 py-4',
    }"
    @update:open="onOpenUpdate"
  >
    <template #header>
      <UIcon
        name="i-material-symbols-volume-up-rounded"
        class="text-theme-cyan"
        size="24"
      />
      <span
        class="text-lg font-bold"
        v-text="$t('tts_try_modal_title')"
      />
      <UIcon
        name="i-material-symbols-close"
        class="text-dimmed cursor-pointer ml-auto hover:text-default"
        size="24"
        @click="handleRemindMeLater"
      />
    </template>
    <template #body>
      <p
        class="text-center text-base whitespace-pre"
        v-text="$t('tts_try_modal_description')"
      />
      <TTSVoiceSelector
        icon="i-material-symbols-check-circle-rounded"
        @voice-click="handleVoiceClick"
      />
    </template>
    <template #footer>
      <UButton
        class="w-full"
        :label="$t('tts_try_modal_remind_me_later')"
        block
        size="xl"
        color="neutral"
        @click="handleRemindMeLater"
      />
      <UButton
        :label="$t('tts_try_modal_dismiss_button')"
        block
        size="xl"
        variant="link"
        @click="handleDismiss"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TTSTryModalProps } from './TTSTryModal.props'

const props = defineProps<TTSTryModalProps>()

const emit = defineEmits<{
  open: []
  close: []
  snooze: []
  dismiss: []
  voiceSelected: [languageVoice: string]
}>()

const { t: $t } = useI18n()
const { setTTSLanguageVoice } = useTTSVoice()

function handleRemindMeLater() {
  emit('snooze')
}

function handleDismiss() {
  emit('dismiss')
}

function handleVoiceClick(sample: { id: string, languageVoice: string }) {
  const { id: sampleId, languageVoice } = sample

  setTTSLanguageVoice(languageVoice)
  useLogEvent('tts_try_voice_selected', {
    sample: sampleId,
    languageVoice,
  })
  emit('voiceSelected', languageVoice)
}

onMounted(() => {
  emit('open')
  useLogEvent('tts_try_modal_open', {
    nft_class_id: props.nftClassId,
  })
})

const onOpenUpdate = (open: boolean) => {
  if (open) {
    emit('open')
  }
  else {
    emit('close')
  }
}
</script>
