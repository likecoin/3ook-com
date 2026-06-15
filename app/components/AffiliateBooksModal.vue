<template>
  <UModal
    v-model:open="open"
    :title="$t('tts_samples_section_affiliate_books_modal_title')"
    :ui="{
      content: 'sm:max-w-md',
      body: 'flex flex-col gap-6',
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
              <NuxtLink
                :to="getPublisherStoreRoute(publisher.wallet)"
                class="group flex items-center gap-2 text-sm text-muted"
                @click="open = false"
              >
                <UIcon
                  name="i-material-symbols-store-outline-rounded"
                  class="shrink-0 text-dimmed"
                />
                <span
                  class="group-hover:text-primary"
                  v-text="$t('tts_samples_section_affiliate_books_modal_publisher_books', { name: publisher.name })"
                />
              </NuxtLink>
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
  </UModal>
</template>

<script setup lang="ts">
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

const props = defineProps<{ affiliateLikerId: string }>()

const open = defineModel<boolean>('open', { default: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const metadataStore = useMetadataStore()

const config = ref<AffiliatePublicConfig | null>(null)
const isLoading = ref(false)

const bookClassIds = computed(() => (config.value?.active ? config.value.affiliateClassIds : []))
const publisherWallets = computed(() => (config.value?.active ? config.value.affiliatePublisherWallets : []))
const publishers = computed(() => publisherWallets.value.map(wallet => ({
  wallet,
  name: metadataStore.getLikerInfoByWalletAddress(wallet)?.displayName || shortenWalletAddress(wallet),
})))

function getPublisherStoreRoute(wallet: string) {
  return localeRoute({ name: 'store', query: { owner_wallet: wallet } })
}

async function loadData() {
  if (config.value || isLoading.value) return
  isLoading.value = true
  const likerId = props.affiliateLikerId
  try {
    const result = await apiFetch<AffiliatePublicConfig>(`/affiliate/${encodeURIComponent(likerId)}`)
    // Discard a response superseded by a newer affiliateLikerId
    if (likerId !== props.affiliateLikerId) return
    config.value = result
    await Promise.all(publisherWallets.value.map(wallet =>
      metadataStore.lazyFetchLikerInfoByWalletAddress(wallet).catch(() => { /* ignore */ }),
    ))
  }
  catch (error) {
    console.error('[AffiliateBooksModal] Failed to load:', error)
  }
  finally {
    isLoading.value = false
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
