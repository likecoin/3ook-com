<template>
  <NuxtLayout
    name="default"
    class="!pb-0"
    :is-tab-bar-visible="false"
  >
    <div class="max-laptop:hidden fixed inset-0 overflow-hidden">
      <PaywallBookstoreBackdrop class="!left-0 !right-1/2" />
      <PaywallBookstoreBackdrop class="!left-1/2 !right-0" />
    </div>

    <main class="relative w-full max-w-6xl mx-auto p-4 laptop:pt-6 laptop:px-6 bg-(--app-bg) grow">
      <header class="flex items-center gap-2 mb-4 laptop:mb-6">
        <UButton
          v-if="!isLoading && !loadError"
          :title="$t('plus_checkout_cancel_button')"
          :aria-label="$t('plus_checkout_cancel_button')"
          variant="link"
          :ui="{ base: ['group', 'shrink-0', 'p-0 sm:p-0', 'cursor-pointer'] }"
          @click="handleCancel"
        >
          <img
            src="/logo.svg"
            alt=""
            class="w-8 h-8 block pointer-events-none group-hover:scale-110 transition-transform"
          >
        </UButton>

        <h1
          class="text-2xl font-bold text-theme-cyan"
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
        class="w-full max-w-7xl mx-auto rounded-xl overflow-hidden"
      />
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { usePlusCheckoutStore } from '~/stores/plus-checkout'

definePageMeta({
  layout: false,
  colorMode: 'dark',
})

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
    plusCheckoutStore.clear()
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
      useLogEvent('subscription_embedded_checkout_mounted', {
        transaction_id: plusCheckoutStore.paymentId || undefined,
      })
    }
  }
  catch (error) {
    const errorMessage = getErrorMessage(error)
    useLogEvent('subscription_embedded_checkout_error', {
      error_message: errorMessage,
      transaction_id: plusCheckoutStore.paymentId || undefined,
    })
    loadError.value = errorMessage
    isLoading.value = false
    console.error('[plus-checkout]', error)
  }
}

function handleComplete() {
  const { paymentId, period, coupon, isTrial } = plusCheckoutStore
  plusCheckoutStore.clear()
  navigateTo(localeRoute({
    name: 'plus-success',
    query: {
      period: period || undefined,
      payment_id: paymentId || undefined,
      coupon: coupon || undefined,
      redirect: '1',
      trial: isTrial ? '1' : '0',
    },
  }), { replace: true })
}

function handleCancel() {
  useLogEvent('subscription_embedded_checkout_cancelled', {
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
