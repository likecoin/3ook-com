<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />

    <main class="flex flex-col items-center w-full max-w-xl mx-auto p-4 space-y-4 phone:grow">
      <div class="flex flex-col items-center w-full max-w-lg">
        <div class="bg-white rounded-full px-6 py-2 shadow-sm mb-3">
          <span class="font-bold">{{ $t('pricing_page_subscription') }}</span>
        </div>

        <div class="text-center mb-3">
          <h1 class="text-4xl font-bold mb-3">
            {{ $t('pricing_page_membership_title') }}
          </h1>

          <ul class="space-y-4 text-left">
            <li class="flex items-start">
              <UIcon
                name="i-material-symbols-check"
                class="mt-1 mr-2 text-green-500"
              />
              <span>{{ $t('pricing_page_feature_1') }}</span>
            </li>
            <li class="flex items-start">
              <UIcon
                name="i-material-symbols-check"
                class="mt-1 mr-2 text-green-500"
              />
              <span>{{ $t('pricing_page_feature_2') }}</span>
            </li>
            <li class="flex items-start">
              <UIcon
                name="i-material-symbols-check"
                class="mt-1 mr-2 text-green-500"
              />
              <span>{{ $t('pricing_page_feature_3') }}</span>
            </li>
          </ul>
        </div>

        <div class="w-full mt-6">
          <div class="border border-gray-200 rounded-lg overflow-hidden">
            <div class="flex relative mt-6">
              <div
                v-if="selectedPlan === 'yearly'"
                class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded-full"
              >
                {{ $t('pricing_page_yearly_discount') }}
              </div>
              <label class="flex items-center justify-between w-full p-4 cursor-pointer border-b py-3">
                <div class="flex items-center">
                  <div class="w-6 h-6 flex-shrink-0 mr-4">
                    <div class="w-full h-full rounded-full border border-gray-300 flex items-center justify-center">
                      <div
                        v-if="selectedPlan === 'yearly'"
                        class="w-4 h-4 rounded-full bg-green-500"
                      />
                    </div>
                  </div>
                  <span class="font-bold">{{ $t('pricing_page_yearly') }}</span>
                </div>
                <span class="text-xl font-bold">US $69.9 <span class="text-sm text-gray-500">{{ $t('pricing_page_per_year') }}</span></span>
                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="yearly"
                  class="hidden"
                >
              </label>

              <label class="flex items-center justify-between w-full p-4 cursor-pointer">
                <div class="flex items-center">
                  <div class="w-6 h-6 flex-shrink-0 mr-4">
                    <div class="w-full h-full rounded-full border border-gray-300 flex items-center justify-center">
                      <div
                        v-if="selectedPlan === 'monthly'"
                        class="w-4 h-4 rounded-full bg-green-500"
                      />
                    </div>
                  </div>
                  <span class="font-bold">{{ $t('pricing_page_monthly') }}</span>
                </div>
                <span class="text-xl font-bold">US $6.9 <span class="text-sm text-gray-500">{{ $t('pricing_page_per_month') }}</span></span>
                <input
                  v-model="selectedPlan"
                  type="radio"
                  name="plan"
                  value="monthly"
                  class="hidden"
                >
              </label>
            </div>
          </div>

          <UButton
            class="w-full mt-6 py-4 text-lg cursor-pointer"
            color="primary"
            :label="$t('pricing_page_continue_button')"
            block
            @click="handleSubscribe"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const selectedPlan = ref('yearly')
const { loggedIn: hasLoggedIn } = useUserSession()
const accountStore = useAccountStore()
const isProcessingSubscription = ref(false)
const { handleError } = useErrorHandler()
const localeRoute = useLocaleRoute()

useHead({
  title: $t('pricing_page_title'),
})

async function checkLikerPlusStatus() {
  try {
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }
    const { user } = useUserSession()
    if (user.value?.isLikerPlus) {
      navigateTo(localeRoute({ name: 'account' }))
    }
  }
  catch (error) {
    handleError(error)
  }
}

onMounted(checkLikerPlusStatus)

async function handleSubscribe() {
  useTrackEvent('subscription_button_click', { plan: selectedPlan.value })

  if (isProcessingSubscription.value) return

  try {
    isProcessingSubscription.value = true

    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) {
        isProcessingSubscription.value = false
        return
      }
      const { user } = useUserSession()
      if (user.value?.isLikerPlus) {
        navigateTo(localeRoute({ name: 'account' }))
        isProcessingSubscription.value = false
        return
      }
    }

    const { url } = await fetchLikerPlusCheckoutLink({
      period: selectedPlan.value as 'monthly' | 'yearly',
    })
    window.location.href = url
  }
  catch (error) {
    handleError(error)
    isProcessingSubscription.value = false
  }
}
</script>
