<template>
  <div class="p-6 pt-8 rounded-[20px] bg-white box-[0_4px_4px_0_rgba(0,0,0,0.02)]">
    <AppLogo class="text-green-500 h-5" />

    <h2
      class="mt-[52px] text-green-500 text-2xl font-bold"
      v-text="$t('login_panel_title')"
    />

    <UButton
      class="mt-6"
      type="button"
      :label="$t('login_panel_continue_with_email')"
      size="lg"
      block
      @click="handleConnect('magic')"
    />

    <USeparator
      class="my-4"
      :label="$t('login_panel_or_separator')"
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
  </div>
</template>

<script setup lang="ts">
import { useConnect } from '@wagmi/vue'

const emit = defineEmits<{ connect: [string] }>()

const { t: $t } = useI18n()
const { connectors, error } = useConnect()

const othersConnectors = computed(() => connectors.filter(c => c.id !== 'magic'))

function handleConnect(connectorId = '') {
  emit('connect', connectorId)
}
</script>
