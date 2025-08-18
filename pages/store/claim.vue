<template>
  <main class="flex flex-col justify-center items-center min-h-svh mb-safe py-[56px]">
    <template v-if="!hasLoggedIn">
      <p
        class="text-center text-gray-500 mb-4"
        v-text="$t('claim_page_login_cta_description')"
      />
      <LoginPanel
        class="max-w-[348px] w-full p-6 pt-8 rounded-[20px] bg-white"
        @connect="handleLogin"
      />
    </template>
    <BookLoadingScreen
      v-else
      :book-name="bookInfo?.name.value"
      :book-cover-src="bookCoverSrc"
      icon="i-material-symbols-check-circle-rounded"
      :icon-label="$t('claim_page_purchase_successful_label')"
      :loading-label="currentLoadingLabel"
    >
      <template
        v-if="canStartReading"
        #footer
      >
        <UButton
          v-if="canStartReading"
          class="max-w-[348px]"
          :to="readerRoute"
          :label="$t('claim_page_start_reading_button_label')"
          size="xl"
          block
          @click="handleStartReadingButtonClick"
        />
      </template>
      <template
        v-else-if="!isAutoDeliver"
        #footer
      >
        <span
          class="px-6"
          v-text="$t('claim_page_wait_for_delivery')"
        />
        <UButton
          class="max-w-[348px] mt-2"
          :label="$t('claim_page_back_to_bookstore_button_label')"
          size="xl"
          block
          :to="localeRoute({ name: 'store' })"
        />
      </template>
    </BookLoadingScreen>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ name: 'claim-page', layout: false })

const { t: $t } = useI18n()
const likeCoinSessionAPI = useLikeCoinSessionAPI()
const localeRoute = useLocaleRoute()
const getRouteQuery = useRouteQuery()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const nftStore = useNFTStore()
const bookshelfStore = useBookshelfStore()
const { errorModal, handleError } = useErrorHandler()

const cartId = computed(() => getRouteQuery('cart_id'))
const claimingToken = computed(() => getRouteQuery('claiming_token'))
const paymentId = computed(() => getRouteQuery('payment_id'))

const baseLoadingLabels = computed(() => [
  $t('claim_page_loading_step_1'),
  $t('claim_page_loading_step_2'),
])

const finalLoadingLabelVariants = computed(() => [
  $t('claim_page_loading_step_3'),
  $t('claim_page_loading_step_3_alt_1'),
  $t('claim_page_loading_step_3_alt_2'),
  $t('claim_page_loading_step_3_alt_3'),
  $t('claim_page_loading_step_3_alt_4'),
  $t('claim_page_loading_step_3_alt_5'),
  $t('claim_page_loading_step_3_alt_6'),
  $t('claim_page_loading_step_3_alt_7'),
  $t('claim_page_loading_step_3_alt_8'),
  $t('claim_page_loading_step_3_alt_9'),
])

const loadingLabelIndex = ref(0)
const randomVariantIndex = ref(0)

const currentLoadingLabel = computed(() => {
  if (loadingLabelIndex.value < baseLoadingLabels.value.length - 1) {
    return baseLoadingLabels.value[loadingLabelIndex.value] || $t('claim_page_loading_label')
  }
  else {
    return finalLoadingLabelVariants.value[randomVariantIndex.value] || $t('claim_page_loading_label')
  }
})

const {
  pause: pauseLoadingLabelAnimation,
  resume: resumeLoadingLabelAnimation,
  isActive: isLoadingLabelAnimationActive,
} = useIntervalFn(() => {
  if (loadingLabelIndex.value < baseLoadingLabels.value.length - 1) {
    loadingLabelIndex.value++
  }
  else {
    randomVariantIndex.value = Math.floor(Math.random() * finalLoadingLabelVariants.value.length)
  }
}, 3000, { immediate: false })

function startLoadingLabelAnimation() {
  loadingLabelIndex.value = 0
  randomVariantIndex.value = 0
  resumeLoadingLabelAnimation()
}

function stopLoadingLabelAnimation() {
  pauseLoadingLabelAnimation()
}

if (!cartId.value || !claimingToken.value || !paymentId.value) {
  throw createError({
    statusCode: 400,
    message: $t('claim_page_missing_parameters'),
    fatal: true,
  })
}

const { data: cartData, error: cartDataError } = await useAsyncData(cartId.value, async () => {
  const data = await likeCoinSessionAPI.fetchCartStatusById({
    cartId: cartId.value,
    token: claimingToken.value,
  })
  return data
})
if (cartDataError.value) {
  console.error('Error fetching cart data:', cartDataError.value)
  const { statusCode, message } = parseError(cartDataError.value)
  throw createError({
    statusCode,
    message,
    fatal: true,
  })
}

// TODO: Handle multiple items in the cart
const nftClassId = computed(() => cartData.value?.classIds[0] || '')

await callOnce(nftClassId.value, async () => {
  if (!nftClassId.value) {
    throw createError({
      message: $t('error_reader_fetch_metadata_failed'),
      fatal: true,
    })
  }

  try {
    await nftStore.fetchNFTClassAggregatedMetadataById(nftClassId.value)
  }
  catch (error) {
    console.error('Error fetching NFT class metadata:', error)
    const { statusCode } = parseError(error)
    throw createError({
      statusCode,
      message: $t('error_reader_fetch_metadata_failed'),
      fatal: true,
    })
  }
})

const status = computed(() => cartData.value?.status)
const isClaimed = ref(!!status.value && ['completed', 'done', 'pending', 'pendingNFT'].includes(status.value))

const bookInfo = useBookInfo({ nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 400 }))

// TODO: Handle multiple items in the cart
const isAutoDeliver = ref(bookInfo.getIsAutoDelivery(cartData.value?.classIdsWithPrice?.[0]?.priceIndex))

const receivedNFTId = computed(() => bookInfo.firstUserOwnedNFTId.value)
const canStartReading = computed(() => !!receivedNFTId.value)

async function checkItemsDeliveryThroughIndexer() {
  // TODO: Handle multiple items
  await Promise.all([
    // Check if the NFT class is already on the bookshelf
    bookshelfStore.fetchItems({ isRefresh: true }),
    // Check if the NFT class owners include the user
    nftStore.fetchNFTClassAggregatedMetadataById(nftClassId.value as string, { include: ['owner'], nocache: true }),
  ])
}

const isCheckingItemsDelivery = ref(false)
const hasBypassedIndexer = ref(false)

async function waitForItemsDelivery({ timeout = 30000, interval = 3000 } = {}) {
  if (isCheckingItemsDelivery.value || !isAutoDeliver.value) return
  try {
    isCheckingItemsDelivery.value = true

    if (!isLoadingLabelAnimationActive.value) {
      startLoadingLabelAnimation()
    }

    const start = Date.now()
    while (!canStartReading.value) {
      try {
        await checkItemsDeliveryThroughIndexer()
      }
      catch (error) {
        console.error('Error checking items delivery through indexer:', error)
      }
      if (canStartReading.value) break
      await sleep(interval)
      if ((Date.now() - start) > timeout) {
        try {
          await bookshelfStore.fetchNFTByNFTClassIdAndOwnerWalletAddressThroughContract(nftClassId.value as string, user.value?.evmWallet as string)
        }
        catch (error) {
          console.error('Error fetching NFT by class ID and owner wallet address:', error)
        }
        if (canStartReading.value) {
          hasBypassedIndexer.value = true
          break
        }
      }
    }
  }
  catch (error) {
    await handleError(error, {
      logPrefix: 'Check Items Delivery',
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
  }
  finally {
    isCheckingItemsDelivery.value = false

    if (canStartReading.value) {
      stopLoadingLabelAnimation()
    }
  }
}

const isClaiming = ref(false)

async function startClaimingItems() {
  if (isClaiming.value) return

  try {
    isClaiming.value = true

    startLoadingLabelAnimation()

    const claimingWallet = user.value?.evmWallet
    if (!claimingWallet) {
      throw createError({
        statusCode: 401,
        message: $t('claim_page_no_wallet_connected'),
        fatal: true,
      })
    }

    const data = await likeCoinSessionAPI.claimCartById({
      cartId: cartId.value,
      token: claimingToken.value,
      paymentId: paymentId.value,
      wallet: claimingWallet,
    })
    if (data.allItemsAutoClaimed) {
      isAutoDeliver.value = true
    }
    else if (
      data.newClaimedNFTs
      && !data.newClaimedNFTs.length
      && data.errors?.length
    ) {
      throw createError({
        statusCode: 400,
        message: data.errors[0]?.error,
        fatal: true,
      })
    }
    isClaimed.value = true
    useLogEvent('purchase', {
      transaction_id: cartId.value,
      value: cartData.value?.price,
      currency: 'USD',
      items: cartData.value?.classIdsWithPrice.map((item) => {
        const {
          classId,
          priceIndex,
          quantity,
          price,
        } = item
        return {
          id: `${classId}-${priceIndex}`,
          quantity,
          price,
          name: bookInfo?.name.value,
          currency: 'USD',
          google_business_vertical: 'retail',
        }
      }),
    })
  }
  catch (error) {
    // If error is CART_ALREADY_CLAIMED_BY_WALLET, just skip and set isClaimed as if nothing happened
    if (getErrorMessage(error) === 'CART_ALREADY_CLAIMED_BY_WALLET') {
      isClaimed.value = true
    }
    else {
      await handleError(error, {
        title: $t('claim_page_claim_error'),
        customHandlerMap: {
          CART_ALREADY_CLAIMED_BY_OTHER: {
            description: $t('claim_page_cart_already_claimed'),
            onClose: () => {
              isClaimed.value = true
            },
          },
          CART_ALREADY_CLAIMED: {
            description: $t('claim_page_cart_already_claimed'),
            onClose: () => {
              isClaimed.value = true
            },
          },
        },
        logPrefix: 'Claim Items',
        onClose: () => {
          navigateTo(localeRoute({ name: 'store' }))
        },
      })
    }
  }
  finally {
    isClaiming.value = false
    stopLoadingLabelAnimation()
  }

  if (isClaimed.value) {
    // Check if the items are already in the bookshelf after claiming
    await waitForItemsDelivery()
  }
}

function startClaimFlow() {
  if (isClaimed.value) {
    waitForItemsDelivery()
  }
  else {
    startClaimingItems()
  }
}

onMounted(() => {
  if (hasLoggedIn.value) {
    startClaimFlow()
  }
})

watch(hasLoggedIn, (value) => {
  if (value) {
    startClaimFlow()
  }
})

async function handleLogin(connectorId: string) {
  if (hasLoggedIn.value) return
  await accountStore.login(connectorId)
}

const readerRoute = computed(() => bookInfo.getReaderRoute.value({
  nftId: receivedNFTId.value,
  shouldCustomMessageDisabled: hasBypassedIndexer.value,
}))

function handleStartReadingButtonClick() {
  if (!readerRoute.value) {
    errorModal.open({
      title: $t('claim_page_content_url_not_found_error'),
      onClose: () => {
        navigateTo(localeRoute({ name: 'shelf' }))
      },
    })
  }
}
</script>
