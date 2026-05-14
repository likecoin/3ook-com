<template>
  <!-- Claim State -->
  <main v-if="!isLoading && !error && giftInfo">
    <!-- Header -->
    <div class="w-full bg-theme-black">
      <div class="px-4 py-2">
        <UButton
          class="group"
          :label="$t('gift_plus_claim_back_button')"
          variant="link"
          color="neutral"
          :loading="isRedirecting"
          :ui="{ base: '!px-0 text-white hover:text-theme-cyan' }"
          @click="handleMaybeLater"
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
        <!-- Gift Icon -->
        <div
          v-gsap.from="{
            y: -6,
            rotate: 6,
            delay: 0.5,
            duration: 1,
            ease: 'power1.inOut',
            repeat: -1,
            yoyo: true,
          }"
        >
          <UIcon
            v-gsap.from="{
              opacity: 0,
              scale: 5,
              y: '-400%',
              duration: 0.5,
              ease: 'power3.out',
            }"
            class="text-theme-cyan"
            name="i-material-symbols-featured-seasonal-and-gifts-rounded"
            :size="64"
          />
        </div>

        <!-- Gift Message -->
        <h1
          class="mt-5 text-theme-cyan text-3xl font-bold text-center"
          v-text="$t('gift_plus_claim_title')"
        />

        <p
          class="mt-3 text-white text-lg text-center"
          v-text="$t('gift_plus_claim_description')"
        />

        <!-- Info Section -->
        <PricingPlanBenefits
          v-if="!isExistingPlusMember"
          class="mt-6"
          :title="$t('gift_plus_claim_info_title')"
          :selected-plan="period"
          :is-title-center="true"
          :is-dark-background="true"
          :is-compact="true"
        />
      </div>
    </div>

    <div class="flex flex-col items-center px-4 py-8">
      <!-- Gift Details Card -->
      <UCard class="w-full max-w-md">
        <h3
          class="font-semibold"
          v-text="$t('gift_plus_claim_gift_details')"
        />

        <ul class="mt-4 space-y-3 text-sm">
          <li class="flex justify-between">
            <span class="font-medium">{{ $t('gift_plus_claim_from') }}</span>
            <span v-text="giftInfo.fromName || $t('gift_plus_claim_anonymous')" />
          </li>
          <li class="flex justify-between">
            <span class="font-medium">{{ $t('gift_plus_claim_plan') }}</span>
            <span v-text="period === 'yearly' ? $t('pricing_page_yearly') : $t('pricing_page_monthly')" />
          </li>
        </ul>

        <!-- Gift Message Section -->
        <template
          v-if="giftInfo.message"
          #footer
        >
          <h3
            class="font-semibold"
            v-text="$t('gift_plus_claim_message_title')"
          />
          <p
            class="mt-3 text-sm font-serif"
            v-text="giftInfo.message"
          />
        </template>
      </UCard>

      <!-- Already Plus Member State -->
      <template v-if="isExistingPlusMember">
        <UIcon
          class="mt-16 text-theme-black"
          name="i-material-symbols-check-circle-rounded"
          :size="64"
        />
        <h1
          class="mt-5 text-2xl font-bold"
          v-text="$t('gift_plus_claim_already_member_title')"
        />
        <p
          class="mt-3 text-muted"
          v-text="$t('gift_plus_claim_already_member_description')"
        />

        <UButton
          class="mt-8"
          :label="$t('gift_plus_claim_continue_button')"
          color="primary"
          variant="outline"
          size="xl"
          :ui="{ base: 'cursor-pointer' }"
          @click="handleContinue"
        />
      </template>

      <!-- Action Buttons -->
      <div
        v-else
        class="flex flex-col gap-3 w-full max-w-sm mt-8"
      >
        <UButton
          :label="$t('gift_plus_claim_button')"
          color="primary"
          size="xl"
          :loading="isClaiming"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleClaim"
        />
        <UButton
          :label="$t('gift_plus_claim_maybe_later')"
          color="neutral"
          variant="outline"
          size="xl"
          :loading="isRedirecting"
          block
          :ui="{ base: 'cursor-pointer' }"
          @click="handleMaybeLater"
        />
      </div>
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
        v-text="$t('gift_plus_claim_loading')"
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
        v-text="$t('gift_plus_claim_error_title')"
      />
      <p
        class="mt-3 text-muted"
        v-text="error || $t('gift_plus_claim_error_description')"
      />

      <UButton
        class="mt-8"
        :label="$t('gift_plus_claim_retry')"
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
const accountStore = useAccountStore()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const { yearlyPrice, monthlyPrice } = useSubscription()

const getRouteQuery = useRouteQuery()

useHead({
  title: $t('gift_plus_claim_title'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const isLoading = ref(true)
const isClaiming = ref(false)
const isRedirecting = ref(false)
const error = ref<string | null>(null)
const period = ref<SubscriptionPlan>('yearly')
const giftInfo = ref<{
  fromName?: string
  message?: string
} | null>(null)

const isExistingPlusMember = computed(() => hasLoggedIn.value && user.value?.isLikerPlus)

// Extract query parameters
const cartId = computed(() => getRouteQuery('cart_id') as string || '')
const claimingToken = computed(() => getRouteQuery('claiming_token') as string || '')

const isYearly = computed(() => period.value === 'yearly')
const giftPrice = computed(() => isYearly.value ? yearlyPrice.value : monthlyPrice.value)

async function fetchGiftInfo() {
  try {
    isLoading.value = true
    error.value = null

    // Fetch gift cart details to get gift information
    const cartData = await likeCoinSessionAPI.fetchPlusGiftCartStatusById({
      cartId: cartId.value,
      token: claimingToken.value,
    })

    if (cartData?.giftInfo) {
      const { fromName, message } = cartData.giftInfo
      giftInfo.value = {
        fromName,
        message,
      }

      // Extract period from cart data if available
      if (cartData.period && (cartData.period === 'yearly' || cartData.period === 'monthly')) {
        period.value = cartData.period as SubscriptionPlan
      }
    }
    else {
      error.value = $t('gift_plus_claim_fetch_error_description')
    }
  }
  catch (err) {
    error.value = $t('gift_plus_claim_fetch_error_description')
    await handleError(err, {
      title: $t('gift_plus_claim_fetch_error'),
      description: $t('gift_plus_claim_fetch_error_description'),
    })
  }
  finally {
    isLoading.value = false
  }
}

async function handleClaim() {
  // Ensure user is logged in
  if (!hasLoggedIn.value) {
    await accountStore.login()
    if (!hasLoggedIn.value) return
  }

  if (isClaiming.value) return

  try {
    isClaiming.value = true

    // Call the claim API
    await likeCoinSessionAPI.claimPlusGiftCart({
      cartId: cartId.value,
      token: claimingToken.value,
    })

    // Log claim event
    useLogEvent('plus_gift_claimed', {
      transaction_id: cartId.value,
      currency: 'USD',
      value: giftPrice.value,
    })

    // Refresh session info until Plus status is confirmed
    let retries = 0
    const maxRetries = 12 // 60 seconds total with 5 second intervals
    while (!user.value?.isLikerPlus && retries < maxRetries) {
      await sleep(5000)
      await accountStore.refreshSessionInfo()
      retries++
    }

    // Redirect to account page to show new Plus subscription
    await navigateTo(localeRoute({ name: 'account' }))
  }
  catch (err) {
    await handleError(err, {
      title: $t('gift_plus_claim_error_title'),
      description: $t('gift_plus_claim_error_description'),
    })
    isClaiming.value = false
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

async function handleMaybeLater() {
  await navigateToPage('store')
}

async function handleContinue() {
  await navigateToPage('account')
}

async function handleRetry() {
  await fetchGiftInfo()
}

onMounted(async () => {
  await fetchGiftInfo()
})
</script>
