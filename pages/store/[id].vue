<template>
  <div class="flex flex-col grow">
    <AppHeader />

    <main class="flex flex-col items-center grow px-4 laptop:px-12 pb-[100px]">
      <section class="flex flex-col tablet:flex-row gap-[32px] tablet:gap-[44px] w-full max-w-[1200px]">
        <div class="grow pt-5">
          <AffiliateAlert class="mb-6" />

          <div class="flex flex-col laptop:flex-row gap-6 laptop:gap-8">
            <BookCover
              class="w-[150px] tablet:w-[130px] laptop:w-[220px] shrink-0"
              :src="bookCoverSrc"
              :alt="bookName"
              :is-vertical-center="true"
              :has-shadow="true"
            />

            <div class="flex flex-col justify-center">
              <h1
                class="text-[24px] text-black laptop:text-[32px] desktop:text-[40px] font-bold leading-[1.2]"
                v-text="bookName"
              />

              <ul
                :class="[
                  'flex',
                  'flex-wrap',
                  'gap-x-[64px]',
                  'gap-y-6',
                  'mt-6 tablet:mt-8',
                  '[&>li>div:first-child]:text-gray-600',
                  '[&>li>div:first-child]:text-sm',
                  '[&>li>div:first-child]:mb-2',
                ]"
              >
                <li v-if="bookInfo.authorName.value">
                  <div v-text="$t('product_page_author_name_label')" />
                  <EntityItem :name="bookInfo.authorName.value" />
                </li>
                <li v-if="bookInfo.publisherName.value">
                  <div v-text="$t('product_page_publisher_label')" />
                  <EntityItem :name="bookInfo.publisherName.value" />
                </li>
              </ul>
            </div>
          </div>

          <UTabs
            v-if="infoTabItems.length"
            :items="infoTabItems"
            variant="link"
            class="gap-6 w-full mt-[52px] tablet:mt-[80px]"
            :ui="{ list: 'gap-6 border-0', trigger: 'text-lg font-bold pb-0 px-0', indicator: 'border-1' }"
          >
            <template #description>
              <ExpandableContent>
                <div
                  class="whitespace-pre-line"
                  v-text="bookInfo.description"
                />
              </ExpandableContent>
            </template>

            <template #author>
              <ExpandableContent>
                <div v-text="bookInfo.authorDescription" />
              </ExpandableContent>
            </template>

            <template #file-info>
              <table class="border-separate border-spacing-2">
                <tbody
                  :class="[
                    '[&>tr>td:first-child]:pr-4',
                    'text-sm',
                    '[&>tr>td:first-child]:text-gray-400',
                    '[&>tr>td:last-child]:text-gray-900',
                  ]"
                >
                  <tr v-if="bookInfo.formattedContentTypes">
                    <td v-text="$t('product_page_file_format_label')" />
                    <td v-text="bookInfo.formattedContentTypes" />
                  </tr>
                  <tr v-if="bookInfo.formattedReadingMethods">
                    <td v-text="$t('product_page_reading_methods_label')" />
                    <td v-text="bookInfo.formattedReadingMethods" />
                  </tr>
                  <tr v-if="bookInfo.formattedPublishedDate">
                    <td v-text="$t('product_page_publish_date_label')" />
                    <td v-text="bookInfo.formattedPublishedDate" />
                  </tr>
                </tbody>
              </table>
            </template>
          </UTabs>

          <ul
            v-if="bookInfo.keywords.value"
            class="hidden tablet:flex flex-wrap gap-x-2 gap-y-4 mt-[48px]"
          >
            <li
              v-for="tag in bookInfo.keywords.value"
              :key="tag"
            >
              <TagItem :label="tag" />
            </li>
          </ul>
        </div>

        <div class="relative w-full tablet:max-w-[300px] laptop:max-w-[380px] shrink-0">
          <div class="sticky top-0 pt-5">
            <div
              v-if="pricingItems.length"
              class="bg-white p-4 pb-8 rounded-lg shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]"
            >
              <h2 v-text="$t('product_page_pricing_title')" />
              <ul
                ref="pricing"
                class="mt-2 space-y-2"
              >
                <li
                  v-for="(item, index) in pricingItems"
                  :key="item.name"
                >
                  <button
                    :class="[
                      'flex',
                      'items-start',
                      'gap-3',
                      item.isSelected ? 'bg-green-100' : 'bg-gray-100',
                      item.isSelected ? 'hover:bg-green-200/60' : 'hover:bg-gray-200',
                      'rounded-lg',
                      'w-full',
                      'p-4',
                      'border',
                      item.isSelected ? 'border-green-500' : 'border-gray-300',
                      'transition-[background-color, border-color]',
                      'duration-200',
                      'ease-in-out',
                      { 'cursor-pointer': !item.isSoldOut },
                    ]"
                    @click="handlePricingItemClick(index)"
                  >
                    <UIcon
                      v-if="item.isSelected"
                      class="shrink-0 text-green-500 -mx-0.5"
                      name="i-material-symbols-check-circle"
                      size="24"
                    />
                    <span
                      v-else
                      class="shrink-0 w-[20px] h-[20px] my-0.5 bg-white rounded-full border border-gray-300"
                    />
                    <div class="grow">
                      <div
                        :class="[
                          'flex',
                          'justify-between',
                          'items-center',
                          'gap-3',
                          item.isSoldOut ? 'text-gray-400' : 'text-green-500',
                        ]"
                      >
                        <span
                          class="font-semibold"
                          v-text="item.name"
                        />
                        <span>
                          <span
                            class="text-xs mr-0.5"
                            v-text="item.currency"
                          />
                          <span
                            class="font-semibold"
                            v-text="item.formattedPrice"
                          />
                        </span>
                      </div>
                      <p
                        v-if="item.description"
                        class="mt-2 text-left break-words whitespace-pre-line"
                        v-text="item.description"
                      />
                    </div>
                  </button>
                </li>
              </ul>
              <footer class="flex flex-col mt-6 gap-3">
                <UButton
                  class="hidden cursor-pointer"
                  :label="$t('product_page_add_to_cart_button_label')"
                  size="xl"
                  :disabled="isSelectedPricingItemSoldOut"
                  block
                  @click="handleAddToCartButtonClick"
                />
                <UButton
                  v-bind="checkoutButtonProps"
                  class="cursor-pointer"
                  size="xl"
                  :loading="isPurchasing"
                  :disabled="isSelectedPricingItemSoldOut || isPurchasing"
                  block
                  @click="handlePurchaseButtonClick"
                />

                <UBadge
                  v-if="!selectedPricingItem?.isAutoDeliver"
                  class="self-center font-bold rounded-full pr-3"
                  icon="i-material-symbols-warning-outline"
                  variant="subtle"
                  color="warning"
                  :label="$t('manual_delivery_warning_label')"
                />
              </footer>
            </div>

            <div
              v-if="pricingItems.length"
              class="hidden mt-6"
            >
              <GiftButton
                class="w-full"
                :label="$t('product_page_gift_button_label')"
                @click="handleGiftButtonClick"
              />
            </div>

            <ul class="flex justify-center items-center gap-2 mt-4">
              <li
                v-for="button in socialButtons"
                :key="button.icon"
              >
                <UTooltip
                  :delay-duration="0"
                  :text="button.label"
                >
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="xs"
                    :icon="button.icon"
                    :disabled="!button.isEnabled"
                    :ui="{ base: 'p-2 rounded-full' }"
                    @click="handleSocialButtonClick(button.key)"
                  />
                </UTooltip>
              </li>
            </ul>
          </div>
        </div>

        <ul
          v-if="bookInfo.keywords.value"
          class="flex tablet:hidden flex-wrap gap-x-2 gap-y-3"
        >
          <li
            v-for="tag in bookInfo.keywords.value"
            :key="tag"
          >
            <TagItem :label="tag" />
          </li>
        </ul>
      </section>

      <section class="w-full mt-8 overflow-hidden">
        <div class="relative w-full max-w-[1200px] mx-auto">
          <h2
            class="text-green-500 text-lg font-bold"
            v-text="$t('product_page_related_books_title')"
          />

          <div class="h-[200px] laptop:h-[300px] mt-6">
            <ul class="absolute flex gap-x-6 gap-y-10 animate-pulse">
              <li
                v-for="i in 4"
                :key="i"
              >
                <BookCover class="w-[120px] laptop:w-[170px]" />
              </li>
            </ul>
          </div>
        </div>
      </section>

      <aside
        :class="[
          'fixed',
          'bottom-[56px]',
          'inset-x-4',
          isPricingItemsVisible ? 'hidden' : 'flex',
          'tablet:hidden',
          'gap-4',
          'justify-between',
          'items-center',
          'mb-3',
          'px-5',
          'py-3',
          'rounded-xl',
          'bg-white',
          'shadow-[0px_10px_30px_0px_rgba(0,0,0,0.12)]',
          'z-10',
        ]"
      >
        <span class="text-green-500">
          <span
            class="text-xs mr-0.5"
            v-text="selectedPricingItem?.currency"
          />
          <span
            class="text-2xl font-semibold"
            v-text="selectedPricingItem?.formattedPrice"
          />
        </span>

        <UButton
          v-bind="checkoutButtonProps"
          class="cursor-pointer max-w-[248px]"
          color="primary"
          size="xl"
          :loading="isPurchasing"
          :disabled="isSelectedPricingItemSoldOut || isPurchasing"
          block
          @click="handleStickyPurchaseButtonClick"
        />
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { FetchError } from 'ofetch'
import type { TabsItem } from '@nuxt/ui'

const route = useRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const { t: $t, locale } = useI18n()
const toast = useToast()
const wipModal = useWIPModal()
const formatPrice = useFormatPrice()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const nftStore = useNFTStore()
const { handleError } = useErrorHandler()

const nftClassId = computed(() => getRouteParam('id'))
const {
  generateBookStructuredData,
  generateOGMetaTags,
} = useStructuredData({ nftClassId: nftClassId.value })

if (nftClassId.value !== nftClassId.value.toLowerCase()) {
  await navigateTo(localeRoute({
    name: getRouteBaseName(route),
    params: { id: nftClassId.value.toLowerCase() },
    query: route.query,
  }), { replace: true })
}

await callOnce(async () => {
  try {
    await nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassId.value)
  }
  catch (error) {
    let message = $t('error_unknown')
    let statusCode = 400
    let isKnownError = false
    if (error instanceof FetchError) {
      message = error.message
      statusCode = error.statusCode ?? statusCode
      switch (statusCode) {
        case 404:
          message = $t('product_page_not_found_error')
          isKnownError = true
          break
        case 500:
          message = $t('product_page_fetch_metadata_failed_error')
          break
        default:
      }
    }
    if (!isKnownError) {
      console.error(error)
    }
    throw createError({
      statusCode,
      message,
      fatal: true,
    })
  }
})

const bookInfo = useBookInfo({ nftClassId: nftClassId.value })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 600 }))

const selectedPricingItemIndex = ref(Number(getRouteQuery('price_index') || 0))

const ogTitle = computed(() => {
  const title = bookInfo.name.value
  const author = bookInfo.authorName.value
  return author ? `${title} - ${author}` : title
})
const ogDescription = computed(() => {
  const description = bookInfo.description.value || ''
  return description.length > 200 ? `${description.substring(0, 197)}...` : description
})
const canonicalURL = computed(() => {
  return `${baseURL}${route.path}`
})

const structuredData = computed(() => {
  return generateBookStructuredData({
    canonicalURL: canonicalURL.value,
    image: bookInfo.coverSrc.value,
  })
})

const meta = [
  { name: 'description', content: ogDescription.value },
  { property: 'og:title', content: ogTitle.value },
  { property: 'og:description', content: ogDescription.value },
  { property: 'og:image', content: bookInfo.coverSrc.value },
  { property: 'og:url', content: canonicalURL.value },
  ...generateOGMetaTags({ selectedPricingItemIndex: selectedPricingItemIndex.value }),
]

if (bookInfo.isHidden.value) {
  meta.push({ name: 'robots', content: 'noindex, nofollow' })
}

useHead(() => ({
  title: ogTitle.value,
  meta,
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
  script: structuredData.value
    ? [
        { type: 'application/ld+json', children: JSON.stringify(structuredData.value) },
      ]
    : [],
}))

const infoTabItems = computed(() => {
  const items: TabsItem[] = []

  if (bookInfo.description.value) {
    items.push({
      label: $t('product_page_info_tab_description'),
      slot: 'description',
    })
  }

  if (bookInfo.authorDescription.value) {
    items.push({
      label: $t('product_page_info_tab_author_description'),
      slot: 'author',
    })
  }

  items.push({
    label: $t('product_page_info_tab_file_info'),
    slot: 'file-info',
  })

  return items
})

const pricingItemsElement = useTemplateRef<HTMLLIElement>('pricing')
const isPricingItemsVisible = useElementVisibility(pricingItemsElement)

const pricingItems = computed(() => {
  return bookInfo.pricingItems.value.map((item, index) => ({
    ...item,
    formattedPrice: formatPrice(item.price),
    isSelected: index === selectedPricingItemIndex.value,
  }))
})

const selectedPricingItem = computed(() => {
  return pricingItems.value[selectedPricingItemIndex.value]
})

const bookName = computed(() => bookInfo.name.value)

function handlePricingItemClick(index: number) {
  selectedPricingItemIndex.value = index
}

const socialButtons = computed(() => [
  { key: 'copy-links', label: $t('share_button_hint_copy_link'), icon: 'i-material-symbols-link-rounded', isEnabled: true },
  { key: 'threads', label: $t('share_button_hint_threads'), icon: 'i-simple-icons-threads' },
  { key: 'facebook', label: $t('share_button_hint_facebook'), icon: 'i-simple-icons-facebook' },
  { key: 'whatsapp', label: $t('share_button_hint_whatsapp'), icon: 'i-simple-icons-whatsapp' },
  { key: 'x', label: $t('share_button_hint_x'), icon: 'i-simple-icons-x' },
])

const formattedLogPayload = computed(() => {
  const currency = selectedPricingItem.value?.currency || 'USD'
  const price = selectedPricingItem.value?.price || 0
  return {
    currency,
    value: price,
    items: [{
      id: `${nftClassId.value}-${selectedPricingItemIndex.value}`,
      name: bookName.value,
      price,
      currency,
      quantity: 1,
    }],
  }
})

const isSelectedPricingItemSoldOut = computed(() => {
  return !!selectedPricingItem.value?.isSoldOut
})

const checkoutButtonProps = computed<{
  variant: 'subtle' | 'solid'
  label: string
}>(() => {
  return {
    variant: isSelectedPricingItemSoldOut.value ? 'subtle' : 'solid',
    label: isSelectedPricingItemSoldOut.value
      ? $t('product_page_sold_out_button_label')
      : $t('product_page_checkout_button_label'),
  }
})

onMounted(() => {
  useLogEvent('view_item', formattedLogPayload.value)
})

async function handleSocialButtonClick(key: string) {
  switch (key) {
    case 'copy-links':
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.add({
          title: $t('copy_link_success'),
          duration: 3000,
          icon: 'i-material-symbols-link-rounded',
          color: 'success',
        })
      }
      catch (error) {
        console.error('Failed to copy link:', error)
        toast.add({
          title: $t('copy_link_failed'),
          icon: 'i-material-symbols-error-circle-rounded',
          duration: 3000,
          color: 'error',
        })
      }
      break
    case 'threads':
      // TODO: Handle Threads
      break
    case 'facebook':
      // TODO: Handle Facebook
      break
    case 'whatsapp':
      // TODO: Handle WhatsApp
      break
    case 'x':
      // TODO: Handle X
      break
    default:
  }
}

function handleAddToCartButtonClick() {
  useLogEvent('add_to_cart', formattedLogPayload.value)
  // TODO: Implement add to cart functionality
  wipModal.open({
    title: $t('product_page_add_to_cart_button_label'),
  })
}

const isPurchasing = ref(false)

async function handlePurchaseButtonClick() {
  useLogEvent('add_to_cart', formattedLogPayload.value)
  if (!selectedPricingItem.value) return
  try {
    isPurchasing.value = true
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }
    const { url, paymentId } = await createNFTBookPurchase({
      email: user.value?.email,
      nftClassId: nftClassId.value,
      price: selectedPricingItem.value.price,
      priceIndex: selectedPricingItem.value.index,
      from: getRouteQuery('from'),
      coupon: getRouteQuery('coupon'),
      language: locale.value.split('-')[0],
      utmCampaign: getRouteQuery('utm_campaign'),
      utmMedium: getRouteQuery('utm_medium'),
      utmSource: getRouteQuery('utm_source'),
      gadClickId: getRouteQuery('gclid'),
      gadSource: getRouteQuery('gad_source'),
      fbClickId: getRouteQuery('fbclid'),
    })
    useLogEvent('begin_checkout', {
      ...formattedLogPayload.value,
      transaction_id: paymentId,
    })
    await navigateTo(url, { external: true })
  }
  catch (error) {
    isPurchasing.value = false
    await handleError(error)
  }
}

function handleStickyPurchaseButtonClick() {
  useLogEvent('purchase_sticky_button_click', { nft_class_id: nftClassId.value })
  handlePurchaseButtonClick()
}

function handleGiftButtonClick() {
  useLogEvent('gift_button_click', { nft_class_id: nftClassId.value })
  // TODO: Implement gift functionality
  wipModal.open({
    title: $t('product_page_gift_button_label'),
  })
}
</script>
