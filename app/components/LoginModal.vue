<template>
  <UModal
    :close="{ onClick: () => handleConnect() }"
    :ui="{ content: 'w-min overflow-y-auto' }"
  >
    <template #content>
      <LoginPanel
        :title="title"
        @connect="handleConnect"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
const emit = defineEmits<{ close: [{ id: string, email?: string }] }>()

function handleConnect({ id = '', email }: { id?: string, email?: string } = {}) {
  emit('close', { id, email })
}
</script>
