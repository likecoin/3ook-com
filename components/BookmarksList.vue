<template>
  <div>
    <p
      v-if="items.length === 0"
      class="text-muted py-8 text-center"
      v-text="$t('reader_bookmarks_empty')"
    />
    <div v-else>
      <div
        v-for="item in sortedItems"
        :key="item.id"
        class="flex items-center border-b border-muted hover:bg-muted transition-colors"
      >
        <button
          type="button"
          class="flex-1 min-w-0 text-left pl-4 py-3 cursor-pointer"
          @click="handleItemClick(item)"
        >
          <p
            v-if="item.chapterTitle"
            class="text-xs text-muted mb-1"
            v-text="item.chapterTitle"
          />
          <p
            v-if="item.text"
            class="text-sm line-clamp-2"
            v-text="item.text"
          />
          <p
            v-if="item.locationLabel"
            class="text-xs text-muted mt-1"
            v-text="item.locationLabel"
          />
        </button>
        <UButton
          :aria-label="$t('reader_bookmark_delete_button')"
          class="mx-2 shrink-0"
          icon="i-material-symbols-delete-outline-rounded"
          variant="ghost"
          color="neutral"
          @click="handleDeleteClick(item)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: Annotation[]
}>()

const emit = defineEmits<{
  (e: 'navigate' | 'delete', item: Annotation): void
}>()

const { t: $t } = useI18n()

const sortedItems = computed(() =>
  [...props.items]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(item => ({
      ...item,
      locationLabel: item.page !== undefined
        ? $t('reader_bookmark_page_label', { page: item.page })
        : '',
    })),
)

function handleItemClick(item: Annotation) {
  emit('navigate', item)
}

function handleDeleteClick(item: Annotation) {
  emit('delete', item)
}
</script>
