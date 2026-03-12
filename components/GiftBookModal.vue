<template>
  <UModal
    v-model:open="model"
    :ui="{ content: 'sm:max-w-md' }"
    :title="$t('gift_book_modal_title')"
    :dismissible="!isProcessing"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <img
          class="h-10"
          :src="bookImage"
          :alt="$t('gift_book_modal_title')"
        >
        <span
          class="text-lg font-semibold"
          v-text="$t('gift_book_modal_title')"
        />
      </div>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <!-- Recipient Email -->
        <UFormField
          :label="$t('gift_plus_recipient_email')"
          :error="errors.toEmail"
          :required="true"
        >
          <UInput
            v-model="formData.toEmail"
            class="w-full"
            placeholder="example@email.com"
            type="email"
            size="xl"
            :disabled="isProcessing"
          />
        </UFormField>

        <!-- Recipient Name -->
        <UFormField
          :label="$t('gift_plus_recipient_name')"
          :error="errors.toName"
          :required="true"
        >
          <UInput
            v-model="formData.toName"
            class="w-full"
            :placeholder="$t('gift_book_modal_recipient_name_placeholder')"
            type="text"
            size="xl"
            :disabled="isProcessing"
          />
        </UFormField>

        <!-- Message -->
        <UFormField
          :label="$t('gift_plus_message')"
          :help="$t('gift_plus_message_help_text')"
        >
          <UTextarea
            v-model="formData.message"
            class="w-full"
            :placeholder="$t('gift_plus_message_placeholder')"
            :disabled="isProcessing"
            size="xl"
            :rows="3"
          />
        </UFormField>

        <!-- Sender Name (signature position) -->
        <UFormField
          :label="$t('gift_plus_sender_name')"
          :error="errors.fromName"
          :required="true"
          :help="$t('gift_plus_sender_name_hint_text')"
        >
          <UInput
            v-model="formData.fromName"
            class="w-full"
            :placeholder="$t('gift_plus_sender_name_placeholder')"
            type="text"
            size="xl"
            :disabled="isProcessing"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="$t('gift_book_modal_checkout_button')"
        color="primary"
        size="xl"
        block
        :loading="isProcessing"
        :disabled="!isFormValid || isProcessing"
        @click="handleCheckout"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import bookImage from '~/assets/images/gift-book.png'

const props = defineProps<{
  nftClassId: string
  priceIndex: number
  quantity?: number
  coupon?: string
  from?: string
}>()

const model = defineModel<boolean>({ default: false })

const { t: $t, locale } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { handleError } = useErrorHandler()
const { getCheckoutCurrency } = usePaymentCurrency()
const { getAnalyticsParameters } = useAnalytics()

const isProcessing = ref(false)

const formData = reactive({
  toEmail: '',
  toName: '',
  fromName: '',
  message: $t('gift_plus_message_default'),
})

const errors = reactive({
  toEmail: '',
  toName: '',
  fromName: '',
})

const isFormValid = computed(() => {
  return formData.toEmail.trim() && formData.toName.trim() && formData.fromName.trim()
    && !errors.toEmail && !errors.toName && !errors.fromName
})

watch(model, (isOpen) => {
  if (isOpen) {
    formData.toEmail = ''
    formData.toName = ''
    formData.fromName = ''
    formData.message = $t('gift_plus_message_default')
    errors.toEmail = ''
    errors.toName = ''
    errors.fromName = ''
  }
})

watch(
  () => ({ ...formData }),
  (newVal, oldVal) => {
    for (const key of Object.keys(errors) as (keyof typeof errors)[]) {
      if (newVal[key] !== oldVal[key]) errors[key] = ''
    }
  },
)

async function handleCheckout() {
  if (isProcessing.value) return

  if (!validateEmail(formData.toEmail)) {
    errors.toEmail = $t('gift_plus_invalid_email')
    return
  }

  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  try {
    isProcessing.value = true

    const giftInfo = {
      toEmail: formData.toEmail.trim(),
      toName: formData.toName.trim(),
      fromName: formData.fromName.trim(),
      message: formData.message?.trim() || undefined,
    }

    const email = user.value?.email
    const language = locale.value.split('-')[0]

    const qty = props.quantity || 1
    const { url, paymentId } = await (
      qty > 1
        ? likeCoinSessionAPI.createNFTBookCartPurchase([{
            nftClassId: props.nftClassId,
            priceIndex: props.priceIndex,
            quantity: qty,
          }], {
            email,
            giftInfo,
            coupon: props.coupon,
            from: props.from,
            language,
            currency: getCheckoutCurrency(),
            ...getAnalyticsParameters(),
          })
        : likeCoinSessionAPI.createNFTBookPurchase({
            nftClassId: props.nftClassId,
            priceIndex: props.priceIndex,
            email,
            giftInfo,
            coupon: props.coupon,
            from: props.from,
            language,
            currency: getCheckoutCurrency(),
            ...getAnalyticsParameters(),
          })
    )

    useLogEvent('begin_checkout', {
      nft_class_id: props.nftClassId,
      transaction_id: paymentId,
      is_gift: true,
      gift_to_email: formData.toEmail,
    })

    await navigateTo(url, { external: true })
  }
  catch (error) {
    await handleError(error, {
      title: $t('gift_book_modal_checkout_error'),
    })
  }
  finally {
    isProcessing.value = false
  }
}
</script>
