<template>
  <div class="min-w-[342px] p-6 pt-8 bg-white dark:bg-muted box-[0_4px_4px_0_rgba(0,0,0,0.02)]">
    <AppLogo
      class="mx-auto"
      :height="44"
      @click="logoClickCount++"
    />
    <h2
      v-if="title"
      class="mt-4 text-lg font-bold text-center text-highlighted"
      v-text="title"
    />

    <form
      class="mt-6 flex flex-col gap-2"
      @submit.prevent="handleConnect({ id: 'magic', email: normalizeEmail(emailInput) })"
    >
      <UInput
        id="email"
        v-model="emailInput"
        type="email"
        name="email"
        autocomplete="email"
        autocapitalize="off"
        :placeholder="$t('login_panel_email_placeholder')"
        size="lg"
        @input.once="useLogEvent('login_panel_email_input')"
      />
      <UButton
        type="submit"
        :label="$t('login_panel_continue_with_email')"
        icon="i-material-symbols-mail-outline-rounded"
        size="lg"
        block
        :ui="{ label: 'grow mr-[28px]' }"
        :disabled="!isEmailValid"
      />
    </form>

    <template v-if="shouldShowOthersConnectors">
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
            @click="handleConnect({ id: connector.id })"
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
      class="mt-4 text-xs text-muted text-center leading-5"
    >
      <template #terms>
        <ULink
          class="underline text-default hover:text-highlighted"
          :href="getDocsArticleURL('terms', locale)"
          target="_blank"
          rel="noopener noreferrer"
        >{{ $t('login_panel_terms_link') }}</ULink>
      </template>
      <template #privacy>
        <ULink
          class="underline text-default hover:text-highlighted"
          :href="getDocsArticleURL('privacy', locale)"
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

defineProps<{ title?: string }>()
const emit = defineEmits<{ connect: [{ id: string, email?: string }] }>()

const { t: $t, locale } = useI18n()
const { connectors, error } = useConnect()
const { isApp } = useAppDetection()
const getRouteQuery = useRouteQuery()

const UNLOCK_CLICK_THRESHOLD = 10

const logoClickCount = ref(0)

watch(logoClickCount, (count) => {
  if (count === UNLOCK_CLICK_THRESHOLD) {
    useLogEvent('login_panel_unlocked')
  }
})

const emailInput = ref(getRouteQuery('email'))

const isEmailValid = computed(() => validateEmail(normalizeEmail(emailInput.value)))

const othersConnectors = computed(() => {
  return connectors.filter(c => !['magic', 'injected'].includes(c.id))
})

const shouldShowOthersConnectors = computed(() => {
  return (!isApp.value || logoClickCount.value >= UNLOCK_CLICK_THRESHOLD) && othersConnectors.value.length > 0
})

function handleConnect({ id = '', email }: { id?: string, email?: string } = {}) {
  if (id === 'magic' && !validateEmail(email ?? '')) return
  emit('connect', { id, email })
  useLogEvent('login_panel_connect', { method: id })
}
</script>
