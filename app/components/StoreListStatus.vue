<template>
  <div
    v-if="status === 'affiliate-not-found'"
    class="flex flex-col items-center m-auto py-16 text-center"
  >
    <UIcon
      class="opacity-20 mb-4"
      name="i-material-symbols-person-off-rounded"
      size="128"
    />
    <h2
      class="text-xl font-bold text-highlighted mb-2"
      v-text="$t('store_affiliate_not_found_title')"
    />
    <p
      class="text-muted mb-4"
      v-text="$t('store_affiliate_not_found_description')"
    />
    <UButton
      :label="$t('store_affiliate_not_found_back_button')"
      :to="localeRoute({ name: routeName })"
      color="primary"
      trailing-icon="i-material-symbols-arrow-forward-rounded"
    />
  </div>

  <div
    v-else-if="status === 'loading'"
    class="flex justify-center py-48"
  >
    <UIcon
      class="animate-spin"
      name="material-symbols-progress-activity"
      size="48"
    />
  </div>

  <div
    v-else-if="status === 'search-empty'"
    class="w-full mb-8"
  >
    <div class="flex flex-col items-center py-8">
      <UIcon
        class="opacity-20 mb-4"
        name="i-material-symbols-search-off-rounded"
        size="64"
      />
      <h2
        class="text-xl font-bold text-highlighted mb-2"
        v-text="$t('store_no_search_results')"
      />
      <p
        class="text-muted"
        v-text="$t('store_showing_recommendations')"
      />
      <p
        class="text-muted mt-4"
        v-text="$t('store_no_search_results_contact_message')"
      />
      <UButton
        class="mt-2"
        :label="$t('store_no_search_results_contact')"
        leading-icon="i-material-symbols-chat-bubble-outline-rounded"
        variant="outline"
        color="neutral"
        @click="emit('contactClick')"
      />
    </div>
  </div>

  <div
    v-else-if="status === 'no-items'"
    class="flex flex-col items-center m-auto"
  >
    <UIcon
      class="opacity-20 mb-4"
      name="i-material-symbols-menu-book-outline-rounded"
      size="128"
    />

    <p
      class="text-muted"
      v-text="$t('store_no_items')"
    />

    <UButton
      class="mt-3"
      :label="$t('store_no_items_learn_more')"
      :to="localeRoute({ name: 'about', query: { ll_medium: 'about-link', ll_source: 'store-empty' } })"
      variant="link"
      color="neutral"
      size="sm"
      trailing-icon="i-material-symbols-arrow-forward-rounded"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  status: 'affiliate-not-found' | 'loading' | 'search-empty' | 'no-items'
  routeName: string
}>()

const emit = defineEmits<{
  contactClick: []
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
</script>
