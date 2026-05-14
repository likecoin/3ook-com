<template>
  <UModal
    :title="$t('uploaded_book_delete_confirm_title')"
    :description="$t('uploaded_book_delete_confirm_description')"
    :dismissible="!isDeleting"
    :close="!isDeleting"
    :ui="{ footer: 'flex items-center justify-end' }"
  >
    <template #footer>
      <UButton
        :label="$t('common_cancel')"
        color="neutral"
        variant="outline"
        :disabled="isDeleting"
        @click="emit('close', { isDeleted: false })"
      />
      <UButton
        :label="$t('uploaded_book_delete')"
        color="error"
        :loading="isDeleting"
        @click="handleDelete"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  bookId: string
}>()

const emit = defineEmits<{
  close: [payload: { isDeleted: boolean }]
}>()

const { t: $t } = useI18n()
const uploadedBooksStore = useUploadedBooksStore()
const toast = useToast()

const isDeleting = ref(false)

async function handleDelete() {
  isDeleting.value = true
  try {
    await uploadedBooksStore.deleteBook(props.bookId)
    toast.add({ title: $t('uploaded_book_delete_success') })
    emit('close', { isDeleted: true })
  }
  catch (error) {
    console.error('Failed to delete uploaded book:', error)
    toast.add({ title: $t('uploaded_book_delete_failed'), color: 'error' })
  }
  finally {
    isDeleting.value = false
  }
}
</script>
