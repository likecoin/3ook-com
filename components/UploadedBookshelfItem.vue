<template>
  <li
    class="flex flex-col justify-end"
    :class="isAccessible ? 'opacity-100' : 'opacity-50'"
  >
    <div class="relative">
      <BookCover
        :src="bookCoverSrc"
        :alt="bookInfo.name.value"
        :lazy="props.lazy"
        :has-shadow="true"
        @click="handleCoverClick"
      />
      <div
        v-if="!isAccessible"
        class="absolute inset-0 flex items-center justify-center bg-black/20 rounded"
      >
        <UIcon
          name="i-material-symbols-lock-outline"
          size="32"
          class="text-white"
        />
      </div>
    </div>

    <div class="mt-2 mb-1 w-full h-[24px]">
      <div
        v-if="progressPercentage > 0 && progressPercentage <= 100"
        class="w-full"
      >
        <div
          class="text-xs text-toned mb-0.5"
          v-text="`${progressPercentage}%`"
        />
        <div class="w-full h-1 rounded-full overflow-hidden ring-[0.5px] ring-inset ring-current text-highlighted">
          <div
            class="h-full bg-current transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>
    </div>

    <div class="h-[70px]">
      <div class="flex items-start gap-1">
        <div
          class="text-sm laptop:text-base text-highlighted font-semibold line-clamp-2 grow"
          v-text="bookInfo.name.value"
        />
        <UDropdownMenu
          v-if="isDesktopScreen"
          :items="menuItems"
          :modal="true"
        >
          <UButton
            class="-mr-2 -mt-1"
            icon="i-material-symbols-more-vert"
            color="neutral"
            variant="link"
          />
        </UDropdownMenu>
        <UDrawer
          v-else
          v-model:open="isMobileMenuOpen"
          :handle="false"
        >
          <UButton
            class="-mr-2 -mt-1"
            icon="i-material-symbols-more-vert"
            color="neutral"
            variant="link"
          />
          <template #content>
            <UCard
              class="pb-safe"
              :ui="{ header: 'text-center font-bold' }"
            >
              <template #header>
                {{ bookInfo.name.value }}
              </template>
              <UButton
                v-for="item in menuItems"
                :key="item.label"
                class="cursor-pointer"
                :icon="item.icon"
                :label="item.label"
                variant="link"
                color="neutral"
                size="xl"
                block
                :ui="{ base: 'justify-start' }"
                @click="(e) => {
                  isMobileMenuOpen = false
                  item.onSelect?.(e)
                }"
              />
            </UCard>
          </template>
        </UDrawer>
      </div>

      <div class="h-4 laptop:h-5 mt-0.5 truncate leading-none">
        <span class="text-xs laptop:text-sm text-toned uppercase">
          {{ bookInfo.contentType?.value || contentType }}
        </span>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps({
  bookId: {
    type: String,
    required: true,
  },
  contentType: {
    type: String as PropType<'epub' | 'pdf'>,
    default: 'epub',
  },
  lazy: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  isAccessible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['delete'])

const { t: $t } = useI18n()
const bookInfo = useUploadedBookInfo({ bookId: props.bookId })
const isDesktopScreen = useDesktopScreen()
const { getResizedImageURL } = useImageResize()
const { exportAnnotations } = useExportAnnotations({
  bookId: computed(() => props.bookId),
  bookName: bookInfo.name,
})
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const progressPercentage = computed(() => Math.round(props.progress * 100))

const isMobileMenuOpen = ref(false)

const menuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = []

  if (props.isAccessible) {
    items.push({
      label: $t('uploaded_book_open'),
      icon: 'i-material-symbols-book-5-outline',
      onSelect: openBook,
    })

    items.push({
      label: $t('bookshelf_item_menu_tts'),
      icon: 'i-material-symbols-graphic-eq-rounded',
      onSelect: openTTSPlayer,
    })

    items.push({
      label: $t('bookshelf_item_menu_export_annotations'),
      icon: 'i-material-symbols-upload-rounded',
      onSelect: exportAnnotations,
    })
  }

  items.push({
    label: $t('uploaded_book_delete'),
    icon: 'i-material-symbols-delete-outline',
    onSelect: () => emit('delete', props.bookId),
  })

  return items
})

function navigateToReader({ isTTS = false } = {}) {
  const route = bookInfo.getReaderRoute.value({})
  if (!route) return
  navigateTo(isTTS ? { ...route, query: { ...route.query, tts: '1' } } : route)
}

function openBook() {
  navigateToReader()
}

function openTTSPlayer() {
  navigateToReader({ isTTS: true })
}

function handleCoverClick() {
  if (!props.isAccessible) return
  openBook()
}
</script>
