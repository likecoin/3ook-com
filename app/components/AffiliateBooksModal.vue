<template>
  <UModal
    v-model:open="open"
    :title="$t('tts_samples_section_affiliate_books_modal_title')"
    :ui="{
      content: 'sm:max-w-md',
      body: 'flex flex-col gap-6',
      footer: 'flex justify-center',
    }"
  >
    <template #body>
      <div
        v-if="isLoading"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-material-symbols-progress-activity"
          class="size-6 text-muted animate-spin"
        />
      </div>

      <template v-else>
        <section
          v-if="bookClassIds.length"
          class="flex flex-col gap-3"
        >
          <h3
            class="text-sm font-bold text-highlighted"
            v-text="$t('tts_samples_section_affiliate_books_modal_books_title')"
          />
          <ul class="grid grid-cols-2 gap-x-4 gap-y-3">
            <li
              v-for="classId in bookClassIds"
              :key="classId"
            >
              <AffiliateBookListItem
                :nft-class-id="classId"
                @navigate="open = false"
              />
            </li>
          </ul>
        </section>

        <section
          v-if="publishers.length"
          class="flex flex-col gap-3"
        >
          <h3
            class="text-sm font-bold text-highlighted"
            v-text="$t('tts_samples_section_affiliate_books_modal_publishers_title')"
          />
          <ul class="flex flex-col gap-2">
            <li
              v-for="publisher in publishers"
              :key="publisher.wallet"
            >
              <UButton
                :to="getPublisherStoreRoute(publisher.wallet)"
                :label="$t('tts_samples_section_affiliate_books_modal_publisher_books', { name: publisher.name })"
                leading-icon="i-material-symbols-store-outline-rounded"
                color="neutral"
                variant="link"
                :ui="{
                  base: 'px-0',
                  label: 'border-b border-current pb-0.5',
                }"
                @click="open = false"
              />
            </li>
          </ul>
        </section>

        <p
          v-if="!bookClassIds.length && !publishers.length"
          class="py-4 text-sm text-muted text-center"
          v-text="$t('tts_samples_section_affiliate_books_modal_empty')"
        />
      </template>
    </template>

    <template
      v-if="bookClassIds.length || publishers.length"
      #footer
    >
      <UButton
        :to="affiliateStoreRoute"
        :label="$t('tts_samples_section_affiliate_books_modal_view_all')"
        color="primary"
        variant="outline"
        trailing-icon="i-material-symbols-arrow-forward-rounded"
        @click="open = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

const props = defineProps<{ affiliateLikerId: string }>()

const open = defineModel<boolean>('open', { default: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = ref<AffiliatePublicConfig | null>(null)
const isConfigLoading = ref(false)

const bookClassIds = computed(() => (config.value?.active ? config.value.affiliateClassIds : []))
const publisherWallets = computed(() => (config.value?.active ? config.value.affiliatePublisherWallets : []))
// The wallets only appear once the config lands, so these stay idle until then.
const publisherInfoQueries = useLikerInfosByWalletAddressesQuery(publisherWallets)
const publishers = computed(() => publisherWallets.value.map((wallet, index) => ({
  wallet,
  name: publisherInfoQueries.value[index]?.data?.displayName || shortenWalletAddress(wallet),
})))
// Hold the skeleton until the names land, so the list never renders shortened
// wallets and then swaps them for display names.
const isLoading = computed(() =>
  isConfigLoading.value || publisherInfoQueries.value.some(query => query.isPending))

function getPublisherStoreRoute(wallet: string) {
  return localeRoute({ name: 'store', query: { owner_wallet: wallet } })
}

const affiliateStoreRoute = computed(() =>
  localeRoute({ name: 'store', query: { affiliate: props.affiliateLikerId } }),
)

async function loadData() {
  if (config.value || isConfigLoading.value) return
  isConfigLoading.value = true
  const likerId = props.affiliateLikerId
  try {
    const result = await apiFetch<AffiliatePublicConfig>(`/affiliate/${encodeURIComponent(likerId)}`)
    // Discard a response superseded by a newer affiliateLikerId
    if (likerId !== props.affiliateLikerId) return
    config.value = result
  }
  catch (error) {
    console.error('[AffiliateBooksModal] Failed to load:', error)
  }
  finally {
    isConfigLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) loadData()
})

watch(() => props.affiliateLikerId, () => {
  config.value = null
  if (open.value) loadData()
})
</script>
