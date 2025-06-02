<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col grow px-4 laptop:px-12 pb-4">
      <div class="w-full max-w-[1200px] mx-auto ">
        <h1
          class="mt-4 laptop:mt-10 mb-6 text-green-500 text-xl laptop:text-3xl font-bold"
          v-text="$t('cart_page_title')"
        />
        <div
          v-if="shoppingCartStore.count > 0"
          class="flex max-laptop:flex-col justify-between gap-[64px]"
        >
          <div class="w-full laptop:max-w-[640px]">
            <header class="grid grid-cols-12 text-gray-400 leading-none">
              <div
                class="col-span-9"
                v-text="$t('cart_page_list_header_item_label')"
              />
              <div
                class="col-span-2 text-center"
                v-text="$t('cart_page_list_header_quantity_label')"
              />
            </header>
            <ul class="divide-y divide-black/10">
              <ShoppingCartItem
                v-for="item in shoppingCartStore.items"
                :key="item.nftClassId"
                :nft-class-id="item.nftClassId"
                :price="item.price"
                :quantity="item.quantity"
                @click-cover="handleCartItemCoverClick"
                @remove="handleCartItemRemove"
              />
            </ul>
          </div>

          <aside class="relative w-full max-w-[380px] max-laptop:mx-auto">
            <header class="flex justify-between items-center text-sm leading-none">
              <span
                class="text-gray-600"
                v-text="$t('cart_page_discount_label')"
              />
              <span
                class="text-gray-400"
                v-text="$t('cart_page_discount_text')"
              />
            </header>
            <div class="flex justify-between items-center leading-none mt-3">
              <span
                class="text-gray-600 laptop:text-lg font-semibold"
                v-text="$t('cart_page_total_label')"
              />
              <span class="text-gray-900">
                <span
                  class="mr-0.5 max-laptop:text-sm"
                  v-text="shoppingCartStore.totalPriceCurrency"
                />
                <span
                  class="text-2xl laptop:text-3xl font-semibold"
                  v-text="shoppingCartStore.formattedTotalPrice"
                />
              </span>
            </div>
            <footer class="mt-6">
              <UButton
                :label="$t('cart_page_checkout_button_label')"
                size="xl"
                :loading="isCheckingOut"
                :disabled="isCheckingOut"
                block
                @click="handleCheckoutButtonClick"
              />
            </footer>
          </aside>
        </div>
        <div
          v-else
          class="flex flex-col items-center grow"
        >
          <div class="flex flex-col justify-center items-center py-4 max-laptop:grow">
            <img
              class="w-[120px]"
              src="~/assets/images/shopping-cart.png"
            >
            <span
              class="mt-2 text-gray-400 font-semibold leading-none"
              v-text="$t('cart_page_empty_description')"
            />
          </div>
          <UButton
            class="max-w-[348px] laptop:mt-12"
            leading-icon="i-material-symbols-storefront-outline"
            :label="$t('cart_page_empty_cta_button_label')"
            size="xl"
            block
            :to="localeRoute({ name: 'store' })"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const shoppingCartStore = useShoppingCartStore()
const { handleError } = useErrorHandler()

useHead({ title: $t('cart_page_title') })

function handleCartItemCoverClick(nftClassId: string) {
  useTrackEvent('view_item', { nftClassId })
}

function handleCartItemRemove(nftClassId: string) {
  useTrackEvent('remove_from_cart', { nftClassId })
  shoppingCartStore.removeItemByNFTClassId(nftClassId)
}

const isCheckingOut = ref(false)

async function handleCheckoutButtonClick() {
  if (!shoppingCartStore.count) return
  try {
    isCheckingOut.value = true
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }
    const { url, paymentId } = await createNFTBookCartCheckout({
      email: user.value?.email,
      items: shoppingCartStore.items,
    })
    useTrackEvent('begin_checkout', { payment_id: paymentId })
    await navigateTo(url, { external: true })
  }
  catch (error) {
    isCheckingOut.value = false
    await handleError(error)
  }
}
</script>
