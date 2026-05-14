<template>
  <main class="flex flex-col min-h-screen">
    <!-- Header Section -->
    <div class="bg-theme-black">
      <div class="px-4 py-2">
        <UButton
          class="group"
          variant="link"
          color="neutral"
          :ui="{ base: '!px-0 text-white hover:text-theme-cyan' }"
          :label="$t('common_back')"
          @click="handleCancel"
        >
          <template #leading>
            <div class="rounded-full p-1 border-1 text-white group-hover:text-theme-cyan border-gray-300 flex">
              <UIcon
                name="i-material-symbols-arrow-back-rounded"
                class="w-4 h-4"
              />
            </div>
          </template>
        </UButton>
      </div>

      <div class="flex flex-col items-center justify-center px-4 pt-8 pb-16">
        <UIcon
          class="text-theme-cyan"
          name="i-material-symbols-featured-seasonal-and-gifts-rounded"
          :size="64"
        />
        <h1
          class="mt-5 text-theme-cyan text-3xl font-bold text-center"
          v-text="$t('gift_plus_title')"
        />
        <p
          class="mt-3 text-white text-lg text-center"
          v-text="$t('gift_plus_description')"
        />

        <!-- Info Section -->
        <h2
          class="mt-8 pb-1 text-center font-bold text-lg text-theme-cyan border-b-2 border-current"
          v-text="$t('gift_plus_info_title')"
        />

        <ul
          :class="[
            'mt-6',
            'space-y-4',
            '[&>li]:flex',
            '[&>li]:items-start',
            '[&>li]:gap-3',
            '[&>li>span:first-child]:shrink-0',
            '[&>li>span:first-child]:size-5',
            '[&>li>span:first-child]:text-theme-cyan',
            '[&>li>span:last-child]:text-sm',
            '[&>li>span:last-child]:text-white',
          ]"
        >
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_info_item_1')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_info_item_2')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_info_item_3')" />
          </li>
        </ul>
      </div>
    </div>

    <div class="flex flex-col items-center grow bg-white px-4 pt-8 pb-16">
      <div class="grid tablet:grid-cols-2 gap-12 max-w-3xl w-full">
        <!-- Plus Benefits Section -->
        <PricingPlanBenefits :is-compact="true" />

        <!-- Plan Selection -->
        <PricingPlanSelect v-model="selectedPlan" />
      </div>

      <!-- Gift Form Card -->
      <UCard
        class="mt-12 max-w-xl w-full"
        :ui="{ footer: 'flex justify-center' }"
      >
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
          class="mt-6"
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

        <!-- Sender Name -->
        <UFormField
          class="mt-6"
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

        <UFormField
          class="mt-6"
          :label="$t('gift_plus_message')"
          :help="$t('gift_plus_message_help_text')"
          :hint="$t('form_optional')"
        >
          <UTextarea
            v-model="formData.message"
            class="w-full"
            :placeholder="$t('gift_plus_message_placeholder')"
            :disabled="isProcessing"
            size="xl"
            :rows="4"
          />
        </UFormField>

        <!-- Action Button -->
        <template #footer>
          <UButton
            :label="$t('gift_plus_checkout_button', { plan: selectedPlanLabel })"
            color="primary"
            size="xl"
            :loading="isProcessing"
            :disabled="!isFormValid || isProcessing"
            @click="handleCheckout"
          />
        </template>
      </UCard>
    </div>
  </main>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { isApp } = useAppDetection()
const { handleError } = useErrorHandler()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const { getCheckoutCurrency } = usePaymentCurrency()
const { getAnalyticsParameters } = useAnalytics()

useHead({
  title: $t('gift_plus_page_title'),
  meta: [
    { name: 'description', content: $t('gift_plus_description') },
  ],
})

const selectedPlan = ref<SubscriptionPlan>('yearly')
const selectedPlanLabel = computed(() => {
  if (selectedPlan.value === 'monthly') return $t('pricing_page_monthly')
  return $t('pricing_page_yearly')
})
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
  return (
    formData.toEmail.trim()
    && formData.toName.trim()
    && formData.fromName.trim()
    && !errors.toEmail
    && !errors.toName
    && !errors.fromName
  )
})

async function handleCheckout() {
  // Validate email
  if (!validateEmail(formData.toEmail)) {
    errors.toEmail = $t('gift_plus_invalid_email')
    return
  }

  // Ensure user is logged in
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  if (isProcessing.value) return

  try {
    isProcessing.value = true

    const analyticsParams = getAnalyticsParameters()
    const { url } = await likeCoinSessionAPI.fetchLikerPlusGiftCheckoutLink({
      period: selectedPlan.value,
      giftInfo: {
        toEmail: formData.toEmail.trim(),
        toName: formData.toName.trim(),
        fromName: formData.fromName.trim(),
        message: formData.message?.trim() || undefined,
      },
      currency: getCheckoutCurrency(),
      ...analyticsParams,
      utmCampaign: analyticsParams.utmCampaign || 'gift_plus',
      utmSource: analyticsParams.utmSource || 'website',
      utmMedium: analyticsParams.utmMedium || 'web',
    })

    // Redirect to Stripe checkout
    if (url) {
      await navigateTo(url, { external: true })
    }
  }
  catch (error) {
    await handleError(error, {
      title: $t('gift_plus_checkout_error'),
      description: $t('gift_plus_checkout_error_description'),
    })
  }
  finally {
    isProcessing.value = false
  }
}

function handleCancel() {
  navigateTo(localeRoute({ name: 'store' }))
}

onMounted(async () => {
  if (isApp.value) {
    await navigateTo(localeRoute({ name: 'store' }))
    return
  }
  // Prefill sender name if user is logged in
  if (hasLoggedIn.value && user.value?.displayName) {
    formData.fromName = user.value.displayName
  }
})
</script>
