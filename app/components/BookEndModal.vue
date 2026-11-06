<template>
  <BaseModal
    :title="$t('reader_book_end_title')"
    :actions="actions"
    @close="(result) => emit('close', result as BookEndModalResult | undefined)"
  >
    <template #body>
      <p
        class="text-muted text-sm"
        v-text="description"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import type { BaseModalAction } from './BaseModal.vue'
import type { BookEndModalProps, BookEndModalResult } from './BookEndModal.props'

type BookEndModalAction = BaseModalAction & { result: BookEndModalResult }

const props = defineProps<BookEndModalProps>()

const emit = defineEmits<{ close: [result?: BookEndModalResult] }>()

const { t: $t } = useI18n()

const description = computed(() => props.isBorrowed
  ? $t('reader_book_end_borrowed_description')
  : $t('reader_book_end_owned_description'),
)

const actions = computed<BookEndModalAction[]>(() => {
  const list: BookEndModalAction[] = [
    {
      label: $t('common_close'),
      color: 'neutral',
      variant: 'outline',
      result: 'dismiss',
    },
  ]
  if (props.isBorrowed) {
    list.push({
      label: $t('reader_book_end_collect_button'),
      color: 'primary',
      result: 'collect',
    })
  }
  return list
})
</script>
