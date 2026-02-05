<template>
  <div
    v-if="isApp"
    class="flex flex-col justify-center items-center min-w-[200px] min-h-[200px] px-6 py-4"
  >
    <AppLogo
      class="animate-pulse"
      :weight="64"
      :height="64"
    />
  </div>
  <div
    v-else
    class="min-w-[342px] p-6 pt-8 bg-white dark:bg-muted box-[0_4px_4px_0_rgba(0,0,0,0.02)]"
  >
    <AppLogo
      class="mx-auto"
      :height="44"
    />

    <h2
      class="mt-8 text-theme-black dark:text-theme-white text-2xl font-bold text-center"
      v-text="$t('login_panel_title')"
    />

    <UButton
      class="mt-6"
      type="button"
      :label="$t('login_panel_continue_with_email')"
      icon="i-material-symbols-mail-outline-rounded"
      size="lg"
      block
      :ui="{ label: 'grow mr-[28px]' }"
      @click="handleConnect('magic')"
    />

    <template v-if="othersConnectors.length">
      <USeparator
        class="my-4"
        :label="$t('login_panel_or_separator')"
        :ui="{ label: 'text-neutral-400' }"
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
            :ui="{ base: 'border border-neutral-300', label: 'grow mr-[28px]' }"
            @click="handleConnect(connector.id)"
          >
            <template #leading>
              <LoginConnectorIcon
                class="w-5 h-5"
                :connector-id="connector.id"
                :alt="connector.name"
              />
            </template>
          </UButton>
        </li>
      </ul>
    </template>

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
const { isApp } = useAppDetection()

const othersConnectors = computed(() => {
  // Disable others connectors for app
  return isApp.value
    ? []
    : connectors.filter(c => !['magic', 'injected'].includes(c.id))
})

function handleConnect(connectorId = '') {
  emit('connect', connectorId)
  useLogEvent('login_panel_connect', { method: connectorId })
}

onMounted(() => {
  // Auto-open email login when in app
  if (isApp.value) {
    handleConnect('magic')
  }
})
</script>
