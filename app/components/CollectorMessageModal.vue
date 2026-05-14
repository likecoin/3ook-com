<template>
  <UModal
    v-model:open="open"
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
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <template v-if="hasSubmittedCollectorMessage">
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
        <div class="flex items-center gap-6">
          <BookCover
            class="w-[80px] flex-shrink-0"
            :src="props.bookCoverSrc"
            :alt="props.bookName"
            :has-shadow="false"
            :is-vertical-center="true"
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
          :loading="isLoading"
          @click="handleSubmitMessage"
        />
      </template>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits(['submit', 'update:open'])
const open = defineModel<boolean>('open')
const { t: $t } = useI18n()
const { user } = useUserSession()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { handleError } = useErrorHandler()

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
  paymentId: {
    type: String,
    required: true,
  },
  claimingToken: {
    type: String,
    required: true,
  },
  nftClassId: {
    type: String,
    required: true,
  },
})

const collectorMessage = ref('')
const isLoading = ref(false)
const hasSubmittedCollectorMessage = ref(false)

function handleClose() {
  open.value = false
}

async function handleSubmitMessage() {
  if (!user.value?.evmWallet) {
    throw new Error('User wallet not found')
  }
  const message = collectorMessage.value.trim()
  if (!message) {
    return
  }

  isLoading.value = true

  try {
    const result = await likeCoinSessionAPI.sendCollectorMessage({
      message,
      nftClassId: props.nftClassId,
      wallet: user.value.evmWallet,
      paymentId: props.paymentId,
      claimToken: props.claimingToken,
    })

    hasSubmittedCollectorMessage.value = !!result
  }
  catch (error) {
    handleError(error, {
      title: $t('claim_page_collector_message_error'),
      logPrefix: 'Send Collector Message',
    })
    throw error
  }
  finally {
    isLoading.value = false
    if (hasSubmittedCollectorMessage.value) {
      await sleep(2000)
      handleClose()
    }
  }
}
</script>
