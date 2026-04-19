<template>
  <NuxtLayout
    name="default"
    :is-tab-bar-visible="false"
  >
    <main class="w-full max-w-6xl mx-auto p-4">
      <header class="mb-6">
        <h1
          class="text-2xl font-bold text-highlighted"
          v-text="$t('plus_checkout_title')"
        />
      </header>

      <div
        v-if="loadError"
        class="space-y-4 mb-4 max-w-xl"
      >
        <UAlert
          icon="i-material-symbols-error-outline-rounded"
          color="error"
          variant="subtle"
          :title="$t('plus_checkout_error_title')"
          :description="$t('plus_checkout_error_description')"
        />
        <UButton
          color="primary"
          variant="soft"
          :label="$t('plus_checkout_back_button')"
          @click="handleCancel"
        />
      </div>

      <div
        v-else-if="isLoading"
        class="flex flex-col items-center justify-center py-16"
      >
        <UIcon
          name="i-material-symbols-progress-activity"
          class="text-theme-cyan animate-spin mb-3"
          size="40"
        />
        <p
          class="text-muted"
          v-text="$t('plus_checkout_loading')"
        />
      </div>

      <div
        v-show="!isLoading && !loadError"
        ref="containerRef"
        class="w-full max-w-7xl mx-auto rounded-xl overflow-hidden shadow-sm"
      />

      <div
        v-if="!isLoading && !loadError"
        class="mt-6 flex justify-center"
      >
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('plus_checkout_cancel_button')"
          @click="handleCancel"
        />
      </div>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { usePlusCheckoutStore } from '~/stores/plus-checkout'

definePageMeta({ layout: false })

interface StripeEmbeddedCheckout {
  mount: (el: HTMLElement | string) => void
  destroy: () => void
  unmount: () => void
}

interface StripeInstance {
  initEmbeddedCheckout: (options: {
    fetchClientSecret: () => Promise<string>
    onComplete?: () => void
  }) => Promise<StripeEmbeddedCheckout>
}

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const runtimeConfig = useRuntimeConfig()
const plusCheckoutStore = usePlusCheckoutStore()
const { handleError } = useErrorHandler()
const stripeScript = useScriptStripe()

const containerRef = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const loadError = ref<string | null>(null)
let embeddedCheckout: StripeEmbeddedCheckout | null = null

useHead({
  title: $t('plus_checkout_title'),
})

async function mountCheckout() {
  const publishableKey = runtimeConfig.public.stripePublishableKey
  const clientSecret = plusCheckoutStore.clientSecret

  if (!publishableKey || !clientSecret) {
    await navigateTo(localeRoute({ name: 'plus' }), { replace: true })
    return
  }

  try {
    const { Stripe } = await stripeScript.load() as { Stripe: (publishableKey: string) => StripeInstance }
    const stripe = Stripe(publishableKey)
    embeddedCheckout = await stripe.initEmbeddedCheckout({
      fetchClientSecret: async () => clientSecret,
      onComplete: handleComplete,
    })
    isLoading.value = false
    await nextTick()
    if (containerRef.value) {
      embeddedCheckout.mount(containerRef.value)
      useLogEvent('subscription_embed_checkout_mounted', {
        transaction_id: plusCheckoutStore.paymentId || undefined,
      })
    }
  }
  catch (error) {
    const errorMessage = getErrorMessage(error)
    useLogEvent('subscription_embed_checkout_error', {
      error_message: errorMessage,
      transaction_id: plusCheckoutStore.paymentId || undefined,
    })
    loadError.value = errorMessage
    isLoading.value = false
    handleError(error)
  }
}

function handleComplete() {
  const { paymentId, period, coupon } = plusCheckoutStore
  plusCheckoutStore.clear()
  navigateTo(localeRoute({
    name: 'plus-success',
    query: {
      period: period || undefined,
      payment_id: paymentId || undefined,
      coupon: coupon || undefined,
      redirect: '1',
      trial: '1',
    },
  }), { replace: true })
}

function handleCancel() {
  useLogEvent('subscription_embed_cancelled', {
    transaction_id: plusCheckoutStore.paymentId || undefined,
  })
  plusCheckoutStore.clear()
  navigateTo(localeRoute({ name: 'plus' }), { replace: true })
}

onMounted(() => {
  mountCheckout()
})

onBeforeUnmount(() => {
  if (embeddedCheckout) {
    try {
      embeddedCheckout.destroy()
    }
    catch {
      // already destroyed
    }
    embeddedCheckout = null
  }
})
</script>
