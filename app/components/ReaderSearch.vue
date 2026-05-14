<template>
  <!--
    iOS Safari only opens the soft keyboard if .focus() runs synchronously
    inside a user gesture; the slideover body is unmounted until open, so we
    focus this hidden keeper on tap. text-base (16px) prevents the iOS
    focus-zoom.
  -->
  <input
    ref="mobileFocusKeeper"
    class="sr-only laptop:hidden text-base"
    type="search"
    inputmode="search"
    :aria-label="$t('reader_search_input_placeholder')"
    tabindex="-1"
  >
  <BottomSlideover
    v-model:open="isMobileOpen"
    :title="$t('reader_search_title')"
    body-class="max-h-[75vh]"
    @update:open="handleOpenChange"
  >
    <UButton
      class="laptop:hidden"
      icon="i-material-symbols-search-rounded"
      variant="ghost"
      color="neutral"
      :aria-label="$t('reader_search_button')"
      @click="handleMobileTriggerClick"
    />
    <template #body>
      <div class="flex flex-col gap-3 px-4 py-3">
        <UInput
          ref="mobileInput"
          v-model="query"
          class="w-full"
          size="lg"
          icon="i-material-symbols-search-rounded"
          :placeholder="$t('reader_search_input_placeholder')"
          :loading="isSearching"
          @keydown.enter.prevent="runSearch"
          @blur="handleBlur"
        >
          <template
            v-if="query"
            #trailing
          >
            <UButton
              icon="i-material-symbols-close-rounded"
              color="neutral"
              variant="link"
              size="xs"
              :aria-label="$t('reader_search_clear_label')"
              @click="clearQuery"
            />
          </template>
        </UInput>
      </div>
      <ReaderSearchResultList
        :is-searching="isSearching"
        :results="results"
        :has-searched="hasSearched"
        :query="submittedQuery"
        @select="handleSelect"
      />
    </template>
  </BottomSlideover>

  <USlideover
    v-model:open="isDesktopOpen"
    :title="$t('reader_search_title')"
    side="right"
    :close="{
      color: 'neutral',
      variant: 'soft',
      class: 'rounded-full',
    }"
    :overlay="false"
    :ui="{
      header: 'py-3 min-h-14',
      close: 'top-3',
      body: 'p-0 sm:p-0',
      content: 'max-w-[calc(100vw-44px)] laptop:max-w-[425px] border-l border-gray-500 divide-gray-500',
    }"
    @update:open="handleOpenChange"
  >
    <UButton
      class="max-laptop:hidden"
      icon="i-material-symbols-search-rounded"
      :aria-label="$t('reader_search_button')"
      variant="ghost"
      color="neutral"
    />
    <template #body>
      <div class="flex flex-col gap-3 px-4 py-3">
        <UInput
          ref="desktopInput"
          v-model="query"
          class="w-full"
          size="lg"
          icon="i-material-symbols-search-rounded"
          :placeholder="$t('reader_search_input_placeholder')"
          :loading="isSearching"
          @keydown.enter.prevent="runSearch"
          @blur="handleBlur"
        >
          <template
            v-if="query"
            #trailing
          >
            <UButton
              icon="i-material-symbols-close-rounded"
              color="neutral"
              variant="link"
              size="xs"
              :aria-label="$t('reader_search_clear_label')"
              @click="clearQuery"
            />
          </template>
        </UInput>
      </div>
      <div class="overflow-y-auto pb-[64px]">
        <ReaderSearchResultList
          :is-searching="isSearching"
          :results="results"
          :has-searched="hasSearched"
          :query="submittedQuery"
          @select="handleSelect"
        />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const props = defineProps<{
  searchHandler: (query: string, signal: AbortSignal) => Promise<ReaderSearchResult[]>
}>()

const emit = defineEmits<{
  navigate: [result: ReaderSearchResult]
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const { t: $t } = useI18n()
const isDesktop = useDesktopScreen()

const isDesktopOpen = computed({
  get: () => isDesktop.value && isOpen.value,
  set: (open) => { isOpen.value = open },
})
const isMobileOpen = computed({
  get: () => !isDesktop.value && isOpen.value,
  set: (open) => { isOpen.value = open },
})

const query = ref('')
const submittedQuery = ref('')
const results = ref<ReaderSearchResult[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)

const mobileInput = useTemplateRef<{ inputRef?: Ref<HTMLInputElement | null> } | null>('mobileInput')
const desktopInput = useTemplateRef<{ inputRef?: Ref<HTMLInputElement | null> } | null>('desktopInput')
const mobileFocusKeeper = useTemplateRef<HTMLInputElement | null>('mobileFocusKeeper')

function handleMobileTriggerClick() {
  if (isOpen.value) return
  mobileFocusKeeper.value?.focus({ preventScroll: true })
}

let activeSearchController: AbortController | null = null

function abortActiveSearch() {
  activeSearchController?.abort()
  activeSearchController = null
}

async function runSearch() {
  const trimmed = query.value.trim()
  if (!trimmed) {
    abortActiveSearch()
    results.value = []
    hasSearched.value = false
    submittedQuery.value = ''
    isSearching.value = false
    return
  }

  abortActiveSearch()
  const controller = new AbortController()
  activeSearchController = controller
  isSearching.value = true
  submittedQuery.value = trimmed
  try {
    const next = await props.searchHandler(trimmed, controller.signal)
    if (controller.signal.aborted) return
    results.value = next
    hasSearched.value = true
  }
  catch (error) {
    if (controller.signal.aborted) return
    console.warn('Reader search failed:', error)
    results.value = []
    hasSearched.value = true
  }
  finally {
    if (activeSearchController === controller) {
      activeSearchController = null
      isSearching.value = false
    }
  }
}

function handleBlur() {
  if (!isOpen.value) return
  if (query.value.trim() === submittedQuery.value) return
  runSearch()
}

function clearQuery() {
  abortActiveSearch()
  query.value = ''
  submittedQuery.value = ''
  results.value = []
  hasSearched.value = false
  isSearching.value = false
  focusInput()
}

function handleSelect(result: ReaderSearchResult) {
  abortActiveSearch()
  emit('navigate', result)
  isOpen.value = false
}

function focusInput() {
  nextTick(() => {
    const input = isDesktop.value ? desktopInput.value : mobileInput.value
    input?.inputRef?.value?.focus()
  })
}

function handleOpenChange(open: boolean) {
  if (open) {
    focusInput()
  }
  else {
    abortActiveSearch()
    isSearching.value = false
  }
}

function open() {
  isOpen.value = true
  focusInput()
}

function handleFindHotkey(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey)) return
  if (event.key !== 'f' && event.key !== 'F') return
  event.preventDefault()
  open()
}

useEventListener('keydown', handleFindHotkey)

defineExpose({
  open,
})
</script>
