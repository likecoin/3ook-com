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
          v-if="!isLoading && !hasLoadError"
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
        v-if="hasLoadError"
        class="space-y-4 mb-4 max-w-xl"
      >
        <UAlert
          icon="i-material-symbols-error-outline-rounded"
          color="error"
          variant="subtle"
          :title="$t('plus_checkout_error_title')"
          :description="$t('plus_checkout_error_description')"
        />
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-if="plusCheckoutStore.checkoutPayload"
            color="primary"
            :label="$t('plus_checkout_retry_hosted_button')"
            :loading="isRetryingHosted"
            @click="handleRetryHosted"
          />
          <UButton
            color="primary"
            variant="soft"
            :label="$t('plus_checkout_back_button')"
            :disabled="isRetryingHosted"
            @click="handleCancel"
          />
        </div>
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
        v-show="!isLoading && !hasLoadError"
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
  createEmbeddedCheckoutPage: (options: {
    fetchClientSecret: () => Promise<string>
    onComplete?: () => void
  }) => Promise<StripeEmbeddedCheckout>
}

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const runtimeConfig = useRuntimeConfig()
const plusCheckoutStore = usePlusCheckoutStore()
const plusSessionAPI = usePlusSessionAPI()
const stripeScript = useScriptStripe()
const { handleError } = useErrorHandler()

const containerRef = ref<HTMLElement | null>(null)
const isLoading = ref(true)
const hasLoadError = ref(false)
const isRetryingHosted = ref(false)
let embeddedCheckout: StripeEmbeddedCheckout | null = null
let isDisposed = false
// mount() resolving proves nothing: a Stripe iframe that never paints still
// counts as mounted.
const RENDER_TIMEOUT_MS = 12_000
// Non-zero only while a mounted checkout is unresolved, so it doubles as the
// settled flag every exit path checks before reporting an abandonment.
let mountedAt = 0

useHead({
  title: $t('plus_checkout_title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const { start: armWatchdog, stop: stopWatchdog } = useTimeoutFn(
  handleRenderTimeout,
  RENDER_TIMEOUT_MS,
  { immediate: false },
)

function getCheckoutEventBase() {
  return { transaction_id: plusCheckoutStore.paymentId || undefined }
}

function destroyCheckout() {
  if (!embeddedCheckout) return
  try {
    embeddedCheckout.destroy()
  }
  catch {
    // already destroyed
  }
  embeddedCheckout = null
}

function settle() {
  mountedAt = 0
  stopWatchdog()
}

function handleRenderTimeout() {
  // Stripe sizes the iframe by postMessage, which a throttled background tab may
  // not have processed yet — only judge a checkout the user can actually see.
  if (document.visibilityState === 'hidden') {
    armWatchdog()
    return
  }
  const iframe = containerRef.value?.querySelector('iframe')
  if (iframe && iframe.offsetHeight > 0) return
  useLogEvent('subscription_embedded_checkout_error', {
    ...getCheckoutEventBase(),
    error_reason: 'render_timeout',
    has_iframe: !!iframe,
  })
  settle()
  destroyCheckout()
  hasLoadError.value = true
}

// duration_ms is what separates a bounce off a dead page from a considered
// decision not to buy.
function logAbandoned() {
  if (!mountedAt) return
  const durationMs = Date.now() - mountedAt
  settle()
  useLogEvent('subscription_embedded_checkout_abandoned', {
    ...getCheckoutEventBase(),
    duration_ms: durationMs,
  })
}

async function mountCheckout() {
  const publishableKey = runtimeConfig.public.stripePublishableKey
  const clientSecret = plusCheckoutStore.clientSecret

  if (!publishableKey || !clientSecret) {
    useLogEvent('subscription_embedded_checkout_guard_redirect', {
      has_publishable_key: !!publishableKey,
      has_client_secret: !!clientSecret,
    })
    plusCheckoutStore.clear()
    await navigateTo(localeRoute({ name: 'plus' }), { replace: true })
    return
  }

  try {
    const { Stripe } = await stripeScript.load() as { Stripe: (publishableKey: string) => StripeInstance }
    const stripe = Stripe(publishableKey)
    embeddedCheckout = await stripe.createEmbeddedCheckoutPage({
      fetchClientSecret: async () => clientSecret,
      onComplete: handleComplete,
    })
    // The page can unmount across either await above; without this the late
    // instance is never destroyed and its failures report against a user who left.
    if (isDisposed) {
      destroyCheckout()
      return
    }
    isLoading.value = false
    await nextTick()
    if (!containerRef.value) {
      useLogEvent('subscription_embedded_checkout_error', {
        ...getCheckoutEventBase(),
        error_reason: 'container_missing',
      })
      destroyCheckout()
      hasLoadError.value = true
      return
    }
    embeddedCheckout.mount(containerRef.value)
    mountedAt = Date.now()
    useLogEvent('subscription_embedded_checkout_mounted', getCheckoutEventBase())
    armWatchdog()
  }
  catch (error) {
    if (isDisposed) return
    useLogEvent('subscription_embedded_checkout_error', {
      ...getCheckoutEventBase(),
      error_reason: 'exception',
      error_message: getErrorMessage(error),
    })
    // mount() can throw after the instance exists, leaving a live checkout
    // behind the error screen.
    destroyCheckout()
    hasLoadError.value = true
    isLoading.value = false
    console.error('[plus-checkout]', error)
  }
}

function handleComplete() {
  settle()
  const { paymentId, priceId, period, tier, coupon, isTrial } = plusCheckoutStore
  plusCheckoutStore.clear()
  navigateTo(localeRoute({
    name: 'plus-success',
    query: {
      period: period || undefined,
      // Signal Civic so the success page polls for the tier and lands on /account
      // with Civic copy, rather than treating it as a plain Plus subscription.
      ...(tier === 'civic' ? { tier } : {}),
      payment_id: paymentId || undefined,
      price_id: priceId || undefined,
      coupon: coupon || undefined,
      redirect: '1',
      trial: isTrial ? '1' : '0',
    },
  }), { replace: true })
}

// Stripe gives an embedded session no hosted URL, so recovering the sale means
// minting a second one from the same request rather than redirecting to this one.
async function handleRetryHosted() {
  const payload = plusCheckoutStore.checkoutPayload
  if (!payload || isRetryingHosted.value) return
  isRetryingHosted.value = true
  settle()
  const embeddedPaymentId = plusCheckoutStore.paymentId
  try {
    const { url, paymentId } = await plusSessionAPI.fetchLikerPlusCheckoutLink({
      ...payload,
      uiMode: 'hosted',
    })
    if (!url) {
      throw createError({
        statusCode: 502,
        message: 'Hosted checkout session missing url',
        data: { description: $t('plus_checkout_error_description') },
      })
    }
    useLogEvent('subscription_checkout_hosted_fallback', {
      transaction_id: paymentId,
      embedded_transaction_id: embeddedPaymentId || undefined,
    })
    // The user can leave while the session is minting;
    // never drag them off the page they moved on to.
    // Clearing after the redirect keeps the retry button alive on a throw.
    if (!isDisposed) await navigateTo(url, { external: true })
    plusCheckoutStore.clear()
  }
  catch (error) {
    useLogEvent('subscription_checkout_error', {
      ...getCheckoutEventBase(),
      error_reason: 'hosted_fallback',
      error_message: getErrorMessage(error),
    })
    // Never raise the modal over the page the user moved on to.
    if (isDisposed) return
    await handleError(error, { logPrefix: 'plus-checkout' })
  }
  finally {
    isRetryingHosted.value = false
  }
}

function handleCancel() {
  const hasFailed = hasLoadError.value
  settle()
  useLogEvent('subscription_embedded_checkout_cancelled', {
    ...getCheckoutEventBase(),
    // The error screen's only button lands here, so without this every failed
    // checkout would also count as a deliberate cancellation.
    after_error: hasFailed,
  })
  plusCheckoutStore.clear()
  navigateTo(localeRoute({ name: 'plus' }), { replace: true })
}

onMounted(() => {
  mountCheckout()
})

// onBeforeUnmount misses a tab close or a hard reload. A persisted pagehide is a
// bfcache freeze the user can still return from, so it is not an abandonment —
// this under-reports mobile rather than calling every tab switch a bounce.
useEventListener('pagehide', (event) => {
  if (!event.persisted) logAbandoned()
})

onBeforeUnmount(() => {
  isDisposed = true
  logAbandoned()
  destroyCheckout()
})
</script>
