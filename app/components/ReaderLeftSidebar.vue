<template>
  <USlideover
    v-model:open="open"
    side="left"
    :close="false"
    :ui="{
      body: 'p-0 sm:p-0 flex flex-col overflow-hidden select-none',
      content: 'max-w-[calc(100vw-44px)] laptop:max-w-[425px] border-r border-gray-500',
    }"
  >
    <UButton
      :aria-label="$t('reader_menu_button')"
      icon="i-material-symbols-format-list-bulleted"
      :disabled="disabled"
      variant="ghost"
      color="neutral"
      @click="emit('trigger-click')"
    />

    <template #body>
      <UTabs
        v-model="tab"
        :items="tabItems"
        class="h-full"
        color="neutral"
        :ui="{
          root: 'gap-0',
          list: 'shrink-0 min-h-[56px] bg-transparent border-b border-gray-500 rounded-none',
          content: 'flex-1 min-h-0 overflow-y-auto p-0',
          label: 'max-tablet:sr-only',
          leadingIcon: 'tablet:hidden',
        }"
      >
        <template #toc>
          <slot name="toc" />
        </template>
        <template #bookmarks>
          <slot name="bookmarks" />
        </template>
        <template #annotations>
          <slot name="annotations" />
        </template>
      </UTabs>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { ReaderLeftSidebarProps, ReaderLeftSidebarTab } from './ReaderLeftSidebar.props'

const props = defineProps<ReaderLeftSidebarProps>()

const emit = defineEmits<{
  (e: 'trigger-click'): void
}>()

const open = defineModel<boolean>('open', { default: false })
const tab = defineModel<ReaderLeftSidebarTab>('tab', { default: 'toc' })

const { t } = useI18n()

interface TabItem {
  value: ReaderLeftSidebarTab
  slot: ReaderLeftSidebarTab
  label: string
  icon: string
}

const tabItems = computed<TabItem[]>(() => [
  {
    value: 'toc',
    slot: 'toc',
    label: t('reader_toc_title'),
    icon: 'i-material-symbols-toc-rounded',
  },
  {
    value: 'bookmarks',
    slot: 'bookmarks',
    label: t('reader_bookmarks_title'),
    icon: 'i-material-symbols-bookmarks-rounded',
  },
  ...(props.hasAnnotations
    ? [{
        value: 'annotations' as const,
        slot: 'annotations' as const,
        label: t('reader_annotations_title'),
        icon: 'i-material-symbols-edit-note-rounded',
      }]
    : []),
])
</script>
