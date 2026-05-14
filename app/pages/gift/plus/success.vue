<template>
  <main v-if="!isLoading && !error && giftInfo">
    <!-- Header -->
    <div class="w-full bg-theme-black">
      <div class="px-4 py-2">
        <UButton
          class="group"
          :label="$t('gift_plus_success_continue_button')"
          variant="link"
          color="neutral"
          :loading="isRedirecting"
          :ui="{ base: '!px-0 text-white hover:text-theme-cyan' }"
          @click="handleContinue"
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

      <div class="flex flex-col items-center justify-center px-4 py-8 laptop:pb-16">
        <!-- Success Icon -->
        <div
          v-gsap.from="{
            y: -6,
            delay: 1,
            duration: 1,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true,
          }"
          class="relative"
        >
          <UIcon
            v-gsap.to="{
              opacity: 0,
              duration: 0.5,
              x: '100%',
            }"
            class="text-theme-cyan"
            name="i-material-symbols-featured-seasonal-and-gifts-rounded"
            :size="64"
          />
          <UIcon
            v-gsap.from.fromInvisible="{
              delay: 0.25,
              duration: 0.5,
              x: '-100%',
              rotate: 0,
            }"
            class="absolute inset-0 text-theme-cyan -rotate-30"
            name="i-material-symbols-send-rounded"
            :size="64"
          />
        </div>

        <!-- Success Message -->
        <h1
          class="mt-5 text-theme-cyan text-3xl font-bold text-center"
          v-text="$t('gift_plus_success_title')"
        />

        <p
          class="mt-3 text-white text-lg text-center"
          v-text="$t('gift_plus_success_description')"
        />

        <!-- Info Section -->
        <h3
          class="mt-8 pb-1 text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan"
          v-text="$t('gift_plus_success_info_title')"
        />

        <ul
          :class="[
            'mt-6',
            'space-y-4',
            '[&>li]:flex',
            '[&>li]:items-start',
            '[&>li]:gap-3',
            '[&>li>span:first-child]:shrink-0',
            '[&>li>span:first-child]:text-theme-cyan',
            '[&>li>span:first-child]:size-5',
            '[&>li>span:last-child]:text-sm',
            '[&>li>span:last-child]:text-white',
          ]"
        >
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_success_info_item_1')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_success_info_item_2')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_plus_success_info_item_3')" />
          </li>
        </ul>
      </div>
    </div>

    <div class="flex flex-col items-center px-4 py-8">
      <!-- Gift Details Card -->
      <UCard class="w-full max-w-md">
        <h3
          class="text-center font-semibold"
          v-text="$t('gift_plus_success_details_title')"
        />

        <ul
          :class="[
            'mt-4',
            'space-y-3',
            'text-sm',
            '[&>li]:flex',
            '[&>li]:justify-between',
            '[&>li>span:first-child]:font-bold',
            '[&>li>span:last-child]:text-sm',
          ]"
        >
          <li>
            <span v-text="$t('gift_plus_success_to_email')" />
            <span v-text="giftInfo.toEmail" />
          </li>
          <li v-if="giftInfo.toName">
            <span v-text="$t('gift_plus_success_to_name')" />
            <span v-text="giftInfo.toName" />
          </li>
          <li v-if="giftInfo.fromName">
            <span v-text="$t('gift_plus_success_from_name')" />
            <span v-text="giftInfo.fromName" />
          </li>
          <li>
            <span v-text="$t('gift_plus_success_plan')" />
            <span v-text="period === 'yearly' ? $t('pricing_page_yearly') : $t('pricing_page_monthly')" />
          </li>
        </ul>
      </UCard>

      <!-- Action Button -->
      <UButton
        class="mt-8"
        :label="$t('gift_plus_success_gift_another')"
        color="primary"
        size="xl"
        variant="outline"
        :loading="isRedirecting"
        :ui="{ base: 'cursor-pointer' }"
        @click="handleGiftAnother"
      />
    </div>
  </main>

  <main
    v-else
    class="flex flex-col items-center justify-center grow px-4 py-8"
  >
    <!-- Loading State -->
    <template v-if="isLoading">
      <UIcon
        class="text-theme-cyan animate-bounce"
        name="i-material-symbols-featured-seasonal-and-gifts-rounded"
        :size="64"
      />

      <p
        class="mt-3 text-muted"
        v-text="$t('gift_plus_success_loading')"
      />
    </template>

    <!-- Error State -->
    <template v-else>
      <UIcon
        name="i-material-symbols-error-circle-rounded"
        class="text-error"
        :size="64"
      />

      <h1
        class="mt-5 text-2xl font-bold"
        v-text="$t('gift_plus_success_error_title')"
      />

      <p
        class="mt-3 text-muted"
        v-text="error || $t('gift_plus_success_error_description')"
      />

      <UButton
        class="mt-8"
        :label="$t('gift_plus_success_retry')"
        color="primary"
        variant="outline"
        size="xl"
        :ui="{ base: 'cursor-pointer' }"
        @click="handleRetry"
      />
    </template>
  </main>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const { yearlyPrice, monthlyPrice } = useSubscription()

const getRouteQuery = useRouteQuery()
const route = useRoute()

useHead({
  title: $t('gift_plus_success_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

const isLoading = ref(true)
const isRedirecting = ref(false)
const error = ref<string | null>(null)
const giftInfo = ref<{
  toEmail: string
  toName: string
  fromName: string
} | null>(null)

// Extract query parameters
const cartId = computed(() => getRouteQuery('cart_id') as string || '')
const claimingToken = computed(() => getRouteQuery('claiming_token') as string || '')
const paymentId = computed(() => getRouteQuery('payment_id') as string || '')
const period = computed(() => (getRouteQuery('period') as SubscriptionPlan) || 'yearly')
const isRedirected = computed(() => !!getRouteQuery('redirect'))

const giftPrice = computed(() => period.value === 'yearly' ? yearlyPrice.value : monthlyPrice.value)

async function fetchGiftInfo() {
  const maxRetries = 12 // 60 seconds total with 5 second intervals
  let retries = 0

  try {
    while (retries < maxRetries) {
      // Fetch gift cart details to get recipient/sender information
      const cartData = await likeCoinSessionAPI.fetchPlusGiftCartStatusById({
        cartId: cartId.value,
        token: claimingToken.value,
      })

      // If gift cart has a status, we have gift information
      if (cartData?.giftInfo) {
        const { toEmail, toName, fromName } = cartData.giftInfo
        giftInfo.value = {
          toEmail: toEmail || '',
          toName,
          fromName,
        }

        // Log gift purchase event only if redirected from Stripe
        if (isRedirected.value) {
          useLogEvent('purchase', {
            transaction_id: paymentId.value,
            currency: 'USD',
            value: giftPrice.value,
            items: [{
              id: `plus-gift-${period.value}`,
              name: `Plus Gift (${period.value})`,
              price: giftPrice.value,
              quantity: 1,
            }],
            gift_to_email: giftInfo.value.toEmail,
            gift_from_name: giftInfo.value.fromName,
            gift_to_name: giftInfo.value.toName,
          })

          // Remove redirect parameter to prevent duplication on page refresh
          await navigateTo({
            ...route,
            query: {
              ...route.query,
              redirect: undefined,
            },
          }, { replace: true })
        }

        isLoading.value = false
        return
      }

      // Wait before retrying
      await sleep(5000)
      retries++
    }

    // If we get here, we've exceeded max retries
    error.value = $t('gift_plus_success_fetch_error_description')
    isLoading.value = false
  }
  catch (err) {
    error.value = $t('gift_plus_success_fetch_error_description')
    await handleError(err, {
      title: $t('gift_plus_success_fetch_error'),
      description: $t('gift_plus_success_fetch_error_description'),
    })
    isLoading.value = false
  }
}

async function navigateToPage(routeName: string) {
  isRedirecting.value = true
  try {
    await navigateTo(localeRoute({ name: routeName }))
  }
  catch (err) {
    await handleError(err)
    isRedirecting.value = false
  }
}

async function handleGiftAnother() {
  await navigateToPage('gift-plus')
}

async function handleContinue() {
  await navigateToPage('shelf')
}

async function handleRetry() {
  isLoading.value = true
  error.value = null
  await fetchGiftInfo()
}

onMounted(async () => {
  await fetchGiftInfo()
})
</script>
