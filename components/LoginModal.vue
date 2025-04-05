<template>
  <UModal
    :title="$t('login_modal_title')"
    :close="{ onClick: () => handleConnect() }"
  >
    <template #body>
      <UButton
        type="button"
        :label="$t('login_modal_continue_with_email')"
        size="lg"
        block
        @click="handleConnect('magic')"
      />

      <USeparator
        class="my-4"
        :label="$t('login_modal_or_separator')"
      />

      <ul class="flex flex-col gap-2">
        <li
          v-for="connector in othersConnectors"
          :key="connector.id"
          type="button"
        >
          <UButton
            :label="connector.name"
            color="neutral"
            variant="soft"
            size="lg"
            block
            @click="handleConnect(connector.id)"
          />
        </li>
      </ul>

      <UAlert
        v-if="error"
        class="mt-4"
        :description="error?.message"
        color="error"
        variant="subtle"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useConnect } from '@wagmi/vue'

const emit = defineEmits<{ close: [string] }>()

const { t: $t } = useI18n()
const { connectors, error } = useConnect()

const othersConnectors = computed(() => connectors.filter(c => c.id !== 'magic'))

function handleConnect(connectorId = '') {
  emit('close', connectorId)
}
</script>
