<template>
  <div
    v-if="status === 'profile-not-found'"
    class="flex flex-col items-center m-auto py-16 text-center"
  >
    <UIcon
      class="opacity-20 mb-4"
      name="i-material-symbols-person-off-rounded"
      size="128"
    />
    <h2
      class="text-xl font-bold text-highlighted mb-2"
      v-text="$t('store_profile_not_found_title')"
    />
    <p
      class="text-muted mb-4"
      v-text="$t('store_profile_not_found_description')"
    />
    <UButton
      :label="$t('store_profile_not_found_back_button')"
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
    <div class="flex flex-col items-center gap-6 py-8">
      <UIcon
        class="opacity-20 mb-4"
        name="i-material-symbols-search-off-rounded"
        size="64"
      />

      <div class="flex flex-col items-center gap-2">
        <h2
          class="text-xl font-bold text-highlighted text-center"
          v-text="isLibrary ? $t('library_no_search_results') : $t('store_no_search_results')"
        />
        <template v-if="isLibrary">
          <p
            v-if="isApp"
            class="text-muted text-center"
            v-text="$t('library_no_search_results_discover_more_app')"
          />
          <i18n-t
            v-else
            class="text-muted text-center"
            keypath="library_no_search_results_discover_more"
            tag="p"
          >
            <template #store>
              <ULink
                class="border-y border-t-transparent leading-5"
                :to="localeRoute({ name: 'store', query: route.query })"
              >{{ $t('store_page_title') }}</ULink>
            </template>
          </i18n-t>
        </template>
      </div>

      <aside class="flex flex-col items-center gap-2">
        <p
          class="text-muted"
          v-text="$t('store_no_search_results_contact_message')"
        />
        <UButton
          :label="$t('store_no_search_results_contact')"
          leading-icon="i-material-symbols-chat-bubble-outline-rounded"
          variant="outline"
          color="neutral"
          @click="emit('contactClick')"
        />
      </aside>
    </div>

    <h3
      class="text-center font-semibold"
      v-text="$t('store_showing_recommendations')"
    />
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
const props = defineProps<{
  status: 'profile-not-found' | 'loading' | 'search-empty' | 'no-items'
  routeName: string
}>()

const route = useRoute()
const { isApp } = useAppDetection()

const isLibrary = computed(() => props.routeName === 'library')

const emit = defineEmits<{
  contactClick: []
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
</script>
