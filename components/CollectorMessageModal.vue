<template>
  <UModal
    class="max-w-[400px]"
    :ui="{
      body: [
        'flex',
        'flex-col',
        'items-start',
        'justify-center',
        'w-full',
        'py-6',
        'px-4',
        'gap-4',
        'rounded-xl',
      ],
    }"
    :dismissible="false"
    :title="$t('claim_page_collector_message_title')"
    :default-open="true"
    @close="handleClose"
  >
    <template #body>
      <template v-if="props.hasSubmitted">
        <div class="flex items-center justify-center w-full gap-2 mt-2">
          <UIcon
            name="i-material-symbols-check-circle-rounded"
            class="self-center"
            size="24"
          />
          <span
            class="text-sm text-gray-500"
            v-text="$t('claim_page_collector_message_sent')"
          />
        </div>
      </template>
      <template v-else>
        <div
          class="flex items-center gap-6"
        >
          <BookCover
            class="w-[80px] flex-shrink-0"
            :src="props.bookCoverSrc"
            :alt="props.bookName"
            :has-shadow="false"
          />
          <div class="flex flex-col">
            <span
              class="text-base font-semibold mb-3"
              v-text="props.bookName"
            />
            <span
              class="text-sm text-gray-500"
              v-text="$t('claim_page_book_author')"
            />
            <span
              class="text-sm font-semibold"
              v-text="props.bookAuthor"
            />
          </div>
        </div>
        <span
          class="text-sm font-semibold text-gray-500 mt-2"
          v-text="$t('claim_page_collector_message_subtitle', { author: props.bookAuthor })"
        />
        <UTextarea
          v-model="collectorMessage"
          class="w-full"
          :placeholder="$t('claim_page_collector_message_placeholder')"
          variant="soft"
          autoresize
        />
        <UButton
          class="self-center"
          :disabled="collectorMessage.trim() === ''"
          :label="$t('claim_page_submit_button_label')"
          trailing-icon="i-material-symbols-send-rounded"
          color="neutral"
          variant="outline"
          :loading="props.isLoading"
          @click="handleSubmitMessage"
        />
      </template>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits(['close'])
const { t: $t } = useI18n()

const props = defineProps({
  bookCoverSrc: {
    type: String,
    required: true,
  },
  bookName: {
    type: String,
    required: true,
  },
  bookAuthor: {
    type: String,
    required: true,
  },
  hasSubmitted: {
    type: Boolean,
    default: false,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  handleSubmit: {
    type: Function,
    required: true,
  },
})

const collectorMessage = ref('')

function handleClose() {
  emit('close')
}

async function handleSubmitMessage() {
  if (props.handleSubmit && collectorMessage.value.trim()) {
    await props.handleSubmit({ message: collectorMessage.value })
  }
}
</script>
