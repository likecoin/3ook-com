<template>
  <div class="flex flex-col grow">
    <main class="flex flex-col items-center grow px-4 laptop:px-12 pb-[100px]">
      <template v-if="isLoading">
        <BookLoadingScreen
          v-if="cartItems.length === 1"
          :book-cover-src="cartItems[0]?.bookInfo?.coverSrc"
          :book-name="cartItems[0]?.bookInfo?.name"
          icon="i-material-symbols-shopping-cart"
          :icon-label="$t('checkout_preparing_title')"
          :loading-label="$t('checkout_loading_cart_items')"
          :loading-progress="loadingProgress"
        />
        <div
          v-else
          class="flex flex-col items-center justify-center py-[56px]"
        >
          <UIcon
            class="text-green-500 text-[40px] mb-4"
            name="i-material-symbols-shopping-cart"
          />
          <h1
            class="text-green-500 text-xl font-bold mb-4"
            v-text="$t('checkout_preparing_title')"
          />
          <UProgress
            class="mt-2 max-w-[160px]"
            size="sm"
            :value="loadingProgress"
          />
        </div>
      </template>

      <template v-else-if="cartItems.length > 0">
        <section class="flex flex-col w-full max-w-[800px] mt-8">
          <h1
            class="text-[32px] font-bold text-black mb-8"
            v-text="$t('checkout_page_title')"
          />

          <div class="bg-white p-6 rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)] mb-6">
            <h2
              class="text-lg font-semibold mb-4"
              v-text="$t('checkout_cart_items_title', { count: cartItems.length })"
            />

            <ul class="space-y-4">
              <li
                v-for="item in cartItems"
                :key="`${item.classId}-${item.priceIndex}`"
                class="flex gap-4 p-4 border border-gray-200 rounded-lg"
              >
                <BookCover
                  class="w-[80px] shrink-0"
                  :src="item.bookInfo?.coverSrc"
                  :alt="item.bookInfo?.name"
                  :has-shadow="true"
                />

                <div class="flex-1">
                  <h3
                    class="font-semibold text-black mb-1"
                    v-text="item.bookInfo?.name"
                  />
                  <p
                    v-if="item.bookInfo?.authorName"
                    class="text-sm text-gray-600 mb-2"
                    v-text="$t('checkout_by_author', { author: item.bookInfo.authorName })"
                  />
                  <div class="flex items-center justify-between">
                    <span
                      class="text-sm text-gray-500"
                      v-text="localeString(item.pricingItem?.name || '')"
                    />
                    <div class="flex items-center gap-2">
                      <span
                        class="text-xs text-gray-500"
                        v-text="$t('checkout_quantity_label', { quantity: item.quantity })"
                      />
                      <span class="text-green-600 font-semibold">
                        <span
                          class="text-xs mr-0.5"
                          v-text="totalCurrency"
                        />
                        <span v-text="formatPrice((item.pricingItem?.price || 0) * item.quantity)" />
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div
            v-if="couponCode"
            class="bg-green-50 border border-green-200 p-4 rounded-lg mb-6"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-material-symbols-local-offer"
                class="text-green-600"
              />
              <span
                class="font-semibold text-green-800"
                v-text="$t('checkout_coupon_applied', { code: couponCode })"
              />
            </div>
          </div>

          <div class="bg-gray-50 p-6 rounded-lg mb-6">
            <div class="flex justify-between items-center text-xl font-bold">
              <span v-text="$t('checkout_total_label')" />
              <span class="text-green-600">
                <span
                  class="text-sm mr-0.5"
                  v-text="totalCurrency"
                />
                <span v-text="formatPrice(totalPrice)" />
              </span>
            </div>
          </div>

          <UButton
            class="cursor-pointer self-center max-w-[400px]"
            color="primary"
            size="xl"
            :loading="isPurchasing"
            :disabled="isPurchasing || cartItems.length === 0"
            block
            @click="handleCheckout"
          >
            <template v-if="isPurchasing">
              {{ $t('checkout_processing_button') }}
            </template>
            <template v-else>
              {{ $t('checkout_complete_purchase_button') }}
            </template>
          </UButton>
        </section>
      </template>

      <template v-else>
        <div class="flex flex-col items-center justify-center py-[100px]">
          <UIcon
            class="text-gray-400 text-[64px] mb-4"
            name="i-material-symbols-shopping-cart-off"
          />
          <h1
            class="text-gray-600 text-xl font-bold mb-2"
            v-text="$t('checkout_cart_empty_title')"
          />
          <p
            class="text-gray-500 mb-6"
            v-text="$t('checkout_cart_empty_description')"
          />
          <UButton
            :to="$localeRoute({ name: 'store' })"
            color="primary"
            size="lg"
            :label="$t('checkout_cart_empty_browse_button')"
          />
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
interface CheckoutItem {
  classId: string
  priceIndex: number
  quantity: number
  bookInfo?: {
    name: string
    authorName: string
    coverSrc: string
  }
  pricingItem?: BookstorePrice
}

const likeCoinSessionAPI = useLikeCoinSessionAPI()
const getRouteQuery = useRouteQuery()
const { user } = useUserSession()
const nftStore = useNFTStore()
const bookstoreStore = useBookstoreStore()
const formatPrice = useFormatPrice()
const { handleError } = useErrorHandler()
const { getAnalyticsParameters } = useAnalytics()
const { t: $t, locale } = useI18n()
const localeString = useLocaleString()

// Parse products from query string
// Format: products=12345-0%3A3%2C23456%3A1 (URL encoded: products=12345-0:3,23456:1)
const productsQuery = getRouteQuery('products', '')
const couponCode = getRouteQuery('coupon', '')

const products = computed(() => parseProducts(productsQuery))

const cartItems = computed<CheckoutItem[]>(() => {
  return products.value.map((product) => {
    const nftClass = nftStore.getNFTClassMetadataById(product.classId)
    const bookstoreInfo = bookstoreStore.getBookstoreInfoByNFTClassId(product.classId)

    if (!nftClass || !bookstoreInfo) {
      return null
    }

    let authorName = ''
    if (typeof bookstoreInfo.author === 'object' && bookstoreInfo.author.name) {
      authorName = bookstoreInfo.author.name
    }
    else if (typeof nftClass.author === 'string') {
      authorName = nftClass.author
    }
    else if (typeof nftClass.author === 'object' && nftClass.author.name) {
      authorName = nftClass.author.name
    }

    const bookInfo = {
      name: localeString(bookstoreInfo.name || nftClass.name) || '',
      authorName,
      coverSrc: getResizedImageURL(normalizeURIToHTTP(nftClass.image), { size: 600 }),
    }

    const pricingItem = bookstoreInfo.prices.find(p => p.index === product.priceIndex)

    return {
      classId: product.classId,
      priceIndex: product.priceIndex,
      quantity: product.quantity,
      bookInfo,
      pricingItem,
    }
  }).filter(Boolean) as CheckoutItem[]
})
const isLoading = ref(true)
const isPurchasing = ref(false)
const loadingProgress = ref(0)

onMounted(async () => {
  if (products.value.length > 0) {
    isLoading.value = true
    loadingProgress.value = 10
    await Promise.all(
      products.value.map(async (product) => {
        if (!product) return
        try {
          await nftStore.lazyFetchNFTClassAggregatedMetadataById(product.classId)
          loadingProgress.value += (90 / products.value.length)
        }
        catch (error) {
          console.error(`Failed to load metadata for ${product.classId}:`, error)
        }
      }),
    )
    loadingProgress.value = 100

    if (cartItems.value.length > 0) {
      useLogEvent('add_to_cart', {
        currency: totalCurrency.value,
        value: totalPrice.value,
        items: cartItems.value.map(item => ({
          id: `${item.classId}-${item.priceIndex}`,
          name: item.bookInfo?.name || '',
          price: item.pricingItem?.price || 0,
          currency: totalCurrency.value,
          quantity: item.quantity,
          google_business_vertical: 'retail',
        })),
      })
    }

    setTimeout(() => {
      isLoading.value = false
      if (cartItems.value.length > 0) {
        handleCheckout()
      }
    }, 1000)
  }
  else {
    isLoading.value = false
  }
})

const totalPrice = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + (item.pricingItem?.price || 0) * item.quantity
  }, 0)
})

const totalCurrency = computed(() => {
  return 'USD'
})

function parseProducts(productsString: string): Array<{ classId: string, priceIndex: number, quantity: number }> {
  if (!productsString) return []

  try {
    const decoded = decodeURIComponent(productsString)

    return decoded.split(',').map((productString) => {
      const [productId, quantityStr] = productString.split(':')
      const quantity = quantityStr ? parseInt(quantityStr, 10) || 1 : 1

      if (!productId) {
        throw createError({
          statusCode: 400,
          message: `Invalid product format: "${productString}"`,
        })
      }

      const lastDashIndex = productId.lastIndexOf('-')

      let classId: string
      let priceIndex: number = 0

      if (lastDashIndex === -1) {
        classId = productId
        priceIndex = 0
      }
      else {
        const potentialPriceIndex = productId.substring(lastDashIndex + 1)
        const parsedPriceIndex = parseInt(potentialPriceIndex, 10)

        if (isNaN(parsedPriceIndex)) {
          classId = productId
          priceIndex = 0
        }
        else {
          classId = productId.substring(0, lastDashIndex)
          priceIndex = parsedPriceIndex
        }
      }

      return {
        classId: classId,
        priceIndex,
        quantity,
      }
    })
  }
  catch (error) {
    handleError(error)
    return []
  }
}

async function handleCheckout() {
  if (!cartItems.value.length) return

  try {
    isPurchasing.value = true

    const { url, paymentId } = await likeCoinSessionAPI.createBookCartPurchase(
      cartItems.value.map(item => ({
        nftClassId: item.classId,
        priceIndex: item.priceIndex,
        quantity: item.quantity,
      })),
      {
        email: user.value?.email || undefined,
        coupon: couponCode || undefined,
        language: locale.value.split('-')[0],
        from: 'checkout_page',
        ...getAnalyticsParameters(),
      },
    )

    useLogEvent('begin_checkout', {
      currency: totalCurrency.value,
      value: totalPrice.value,
      items: cartItems.value.map(item => ({
        id: `${item.classId}-${item.priceIndex}`,
        name: item.bookInfo?.name || '',
        price: item.pricingItem?.price || 0,
        currency: totalCurrency.value,
        quantity: item.quantity,
        google_business_vertical: 'retail',
      })),
      transaction_id: paymentId,
    })

    await navigateTo(url, { external: true })
  }
  catch (error) {
    isPurchasing.value = false
    await handleError(error)
  }
}

useHead(() => ({
  title: [$t('checkout_page_title'), $t('app_title')].join(' - '),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
}))
</script>
