<template>
  <UModal
    :close="{ onClick: () => handleConnect() }"
    :ui="{ content: 'max-w-[348px]' }"
  >
    <template #content>
      <LoginPanel @connect="handleConnect" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [string] }>()

function handleConnect(connectorId = '') {
  emit('close', connectorId)
}
</script>
