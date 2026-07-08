<template>
  <UModal
    v-model:open="isSearchInputOpen"
    :close="false"
    :ui="{
      // translate-y-0 cancels the modal theme's default -translate-y-1/2 so the
      // box anchors by its top edge and grows downward as suggestions appear.
      content: 'max-phone:top-30 top-1/4 translate-y-0',
      body: 'p-0 sm:p-0',
      footer: [
        'flex',
        'items-center',
        'justify-between',

        'sm:px-4',
        'pl-3 sm:pl-3',
        'py-2',
      ],
    }"
  >
    <PillButton
      icon="i-material-symbols-search-rounded"
      :aria-label="$t('store_search_label')"
      @click="handleSearchTagClick"
    />

    <template #body>
      <form
        class="w-full"
        action="."
        @submit.prevent="handleSearchSubmit"
      >
        <UInput
          v-model="searchInputValue"
          class="w-full"
          icon="i-material-symbols-search-rounded"
          :loading="isSearchSuggestionsLoading"
          size="xl"
          variant="none"
          :placeholder="$t('store_search_input_placeholder')"
          type="search"
          :ui="{
            base: 'py-5 [&::-webkit-search-cancel-button]:appearance-none',
            trailing: 'pe-2',
          }"
          @compositionstart="isSearchInputComposing = true"
          @compositionend="isSearchInputComposing = false"
          @blur="handleSearchInputBlur"
        >
          <template
            v-if="searchInputValue.length"
            #trailing
          >
            <UButton
              color="neutral"
              variant="link"
              icon="i-material-symbols-close-rounded"
              :aria-label="$t('store_search_clear_label')"
              @click="handleClearSearchInputButton"
            />
          </template>
        </UInput>
      </form>

      <ul
        v-if="shouldShowSearchSuggestions"
        data-search-suggestions
        class="border-t border-default max-h-[min(20rem,50svh)] overflow-y-auto py-2"
        :aria-label="$t('store_search_suggestions_label')"
      >
        <li
          v-for="suggestion in searchSuggestions"
          :key="suggestion.classId"
        >
          <!-- mousedown.prevent keeps focus on the input so its blur
               handler doesn't close the modal before the click lands. -->
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            @mousedown.prevent
            @click="handleSearchSuggestionSelect(suggestion)"
          >
            <img
              v-if="suggestion.thumbnailUrl"
              :src="suggestion.thumbnailUrl"
              alt=""
              class="h-12 w-9 shrink-0 rounded object-cover"
              loading="lazy"
            >
            <span
              class="line-clamp-2 text-sm"
              v-text="suggestion.title"
            />
          </button>
        </li>
      </ul>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  isLibraryTab: boolean
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const isSearchInputOpen = ref(false)
const searchInputValue = ref('')
// Track IME composition so live suggestions don't fire on half-typed CJK input.
const isSearchInputComposing = ref(false)

const { suggestions: searchSuggestions, isLoading: isSearchSuggestionsLoading } = useStoreSearchSuggestions(
  searchInputValue,
  {
    isLibrary: () => props.isLibraryTab,
    isComposing: isSearchInputComposing,
  },
)

const shouldShowSearchSuggestions = computed(() =>
  isSearchInputOpen.value
  && searchInputValue.value.trim().length >= SUGGESTION_MIN_TERM_LENGTH
  && searchSuggestions.value.length > 0,
)

// Keep the modal open when focus moves into the suggestions list so keyboard users
// can Tab from the input to a suggestion; close on any other blur.
function handleSearchInputBlur(event: FocusEvent) {
  const nextFocused = event.relatedTarget as HTMLElement | null
  if (nextFocused?.closest('[data-search-suggestions]')) return
  isSearchInputOpen.value = false
}

function handleSearchTagClick() {
  useLogEvent(props.isLibraryTab ? 'library_tag_search_click' : 'store_tag_search_click')
  searchInputValue.value = ''
}

async function handleSearchSuggestionSelect(suggestion: StoreSearchSuggestion) {
  useLogEvent(props.isLibraryTab ? 'library_search_suggestion_click' : 'store_search_suggestion_click', {
    search_term: searchInputValue.value,
    nft_class_id: suggestion.classId,
    item_name: suggestion.title,
  })
  isSearchInputOpen.value = false
  await navigateTo(localeRoute({
    name: props.isLibraryTab ? 'library-nftClassId' : 'store-nftClassId',
    params: { nftClassId: suggestion.classId },
  }))
}

function handleClearSearchInputButton() {
  useLogEvent(props.isLibraryTab ? 'library_search_input_clear_button_click' : 'store_search_input_clear_button_click')
  searchInputValue.value = ''
}

async function handleSearchSubmit() {
  if (!searchInputValue.value) return

  isSearchInputOpen.value = false
  let query = 'q'
  if (checkIsEVMAddress(searchInputValue.value)) {
    query = 'owner_wallet'
  }
  // Omit search_term for wallet-address searches so we don't forward a persistent
  // on-chain identifier to GA4/Meta; still fire the event to keep the search count.
  useLogEvent(props.isLibraryTab ? 'library_search_submit' : 'store_search_submit', query === 'owner_wallet' ? {} : { search_term: searchInputValue.value })
  await navigateTo({ query: { [query]: searchInputValue.value } })
}
</script>
