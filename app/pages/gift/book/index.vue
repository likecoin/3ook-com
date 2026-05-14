<template>
  <main v-if="!isLoading && !error">
    <!-- Header -->
    <div class="w-full bg-theme-black">
      <div class="px-4 py-2">
        <UButton
          class="group"
          :label="$t('gift_book_success_continue_button')"
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
          v-text="$t('gift_book_success_title')"
        />

        <!-- Info Section -->
        <h3
          class="mt-8 pb-1 text-center font-bold text-lg text-theme-cyan border-b-2 border-theme-cyan"
          v-text="$t('gift_book_success_info_title')"
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
            <span v-text="$t('gift_book_success_info_item_1')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_book_success_info_item_2')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('gift_book_success_info_item_3')" />
          </li>
        </ul>
      </div>
    </div>

    <div class="flex flex-col items-center px-4 py-8">
      <!-- Gift Details Card -->
      <UCard
        v-if="giftInfo"
        class="w-full max-w-md"
      >
        <h3
          class="text-center font-semibold"
          v-text="$t('gift_book_success_details_title')"
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
            <span v-text="$t('gift_book_success_to_email')" />
            <span v-text="giftInfo.toEmail" />
          </li>
          <li v-if="giftInfo.toName">
            <span v-text="$t('gift_book_success_to_name')" />
            <span v-text="giftInfo.toName" />
          </li>
          <li v-if="giftInfo.fromName">
            <span v-text="$t('gift_book_success_from_name')" />
            <span v-text="giftInfo.fromName" />
          </li>
          <li v-if="bookName">
            <span v-text="$t('gift_book_success_book_name')" />
            <span v-text="bookName" />
          </li>
        </ul>
      </UCard>

      <!-- Action Buttons -->
      <div class="flex items-center gap-4 mt-8">
        <UButton
          v-if="nftClassId"
          :label="$t('gift_book_success_gift_another')"
          color="primary"
          size="xl"
          variant="solid"
          :loading="isRedirecting"
          :ui="{ base: 'cursor-pointer' }"
          @click="handleGiftAnother"
        />

        <UButton
          :label="$t('gift_book_success_back_to_store')"
          variant="outline"
          size="xl"
          :loading="isRedirecting"
          :ui="{ base: 'cursor-pointer' }"
          @click="handleContinue"
        />
      </div>
    </div>
  </main>

  <main
    v-else
    class="flex flex-col items-center justify-center grow px-4 py-8 min-h-svh"
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
        v-text="$t('gift_book_success_loading')"
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
        v-text="$t('gift_book_success_error_title')"
      />

      <p
        class="mt-3 text-muted"
        v-text="error || $t('gift_book_success_error_description')"
      />

      <UButton
        class="mt-8"
        :label="$t('gift_book_success_retry')"
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
import type { BookGiftInfo } from '~/composables/use-likecoin-session-api'

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const likeCoinSessionAPI = useLikeCoinSessionAPI()

const getRouteQuery = useRouteQuery()
const route = useRoute()

useHead({
  title: $t('gift_book_success_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

const isLoading = ref(true)
const isRedirecting = ref(false)
const error = ref<string | null>(null)
const giftInfo = ref<BookGiftInfo | null>(null)
const bookName = ref<string>('')

// Extract query parameters
const cartId = computed(() => getRouteQuery('cart_id'))
const claimingToken = computed(() => getRouteQuery('claiming_token'))
const paymentId = computed(() => getRouteQuery('payment_id'))
const nftClassId = computed(() => getRouteQuery('class_id'))
const isRedirected = computed(() => !!getRouteQuery('redirect'))

const nftStore = useNFTStore()

let isCancelled = false
onUnmounted(() => {
  isCancelled = true
})

async function fetchGiftInfo() {
  if (!cartId.value || !claimingToken.value) {
    error.value = $t('gift_book_success_error_description')
    isLoading.value = false
    return
  }

  const maxRetries = 12
  let retries = 0

  try {
    while (retries < maxRetries) {
      if (isCancelled) return

      const cartData = await likeCoinSessionAPI.fetchCartStatusById({
        cartId: cartId.value,
        token: claimingToken.value,
      })

      if (isCancelled) return

      if (cartData?.isPaid) {
        giftInfo.value = cartData.giftInfo || null

        // Fetch book metadata for display
        if (cartData.classIds?.[0]) {
          try {
            const { classData } = await nftStore.fetchNFTClassAggregatedMetadataById(cartData.classIds[0])
            if (isCancelled) return
            bookName.value = classData?.name || ''
          }
          catch { /* ignore */ }
        }

        if (isCancelled) return

        if (isRedirected.value) {
          useLogEvent('purchase', {
            transaction_id: paymentId.value,
            currency: 'USD',
            value: cartData.price,
            is_gift: true,
            gift_to_email: giftInfo.value?.toEmail,
            gift_from_name: giftInfo.value?.fromName,
            gift_to_name: giftInfo.value?.toName,
            items: cartData.classIdsWithPrice?.map(item => ({
              id: `${item.classId}-${item.priceIndex}`,
              quantity: item.quantity,
              price: item.price,
              currency: 'USD',
            })),
          })

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

      await sleep(5000)
      if (isCancelled) return
      retries++
    }

    error.value = $t('gift_book_success_error_description')
    isLoading.value = false
  }
  catch (err) {
    if (isCancelled) return
    error.value = $t('gift_book_success_error_description')
    await handleError(err, {
      title: $t('gift_book_success_error_title'),
      description: $t('gift_book_success_error_description'),
    })
    isLoading.value = false
  }
}

async function navigateToPage(destination: ReturnType<typeof localeRoute>) {
  isRedirecting.value = true
  try {
    await navigateTo(destination)
  }
  catch (err) {
    await handleError(err)
    isRedirecting.value = false
  }
}

async function handleGiftAnother() {
  await navigateToPage(localeRoute({ name: 'store-nftClassId', params: { nftClassId: nftClassId.value } }))
}

async function handleContinue() {
  await navigateToPage(localeRoute({ name: 'store' }))
}

async function handleRetry() {
  isCancelled = false
  isLoading.value = true
  error.value = null
  await fetchGiftInfo()
}

onMounted(async () => {
  await fetchGiftInfo()
})
</script>
