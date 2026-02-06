<template>
  <div class="p-6 pt-8 bg-white dark:bg-muted box-[0_4px_4px_0_rgba(0,0,0,0.02)]">
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

    <i18n-t
      keypath="login_panel_terms_notice"
      tag="p"
      class="mt-4 text-xs text-neutral-500 text-center leading-5"
    >
      <template #terms>
        <ULink
          class="underline text-neutral-700 hover:text-neutral-900"
          href="https://docs.3ook.com/zh-TW/articles/11847208-%E6%9C%8D%E5%8B%99%E6%A2%9D%E6%AC%BE"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('login_panel_terms_link') }}</ULink>
      </template>
      <template #privacy>
        <ULink
          class="underline text-neutral-700 hover:text-neutral-900"
          href="https://docs.3ook.com/zh-TW/articles/11847198-%E7%A7%81%E9%9A%B1%E6%A2%9D%E6%AC%BE"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('login_panel_privacy_link') }}</ULink>
      </template>
    </i18n-t>

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

const othersConnectors = computed(() => connectors.filter(c => !['magic', 'injected'].includes(c.id)))

function handleConnect(connectorId = '') {
  emit('connect', connectorId)
  useLogEvent('login_panel_connect', { method: connectorId })
}
</script>
