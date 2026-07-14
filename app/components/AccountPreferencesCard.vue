<template>
  <section class="space-y-3">
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        icon="i-material-symbols-public"
        :label="$t('account_page_region')"
      >
        <div
          class="text-sm text-muted"
          v-text="regionLabel"
        />

        <template #right>
          <RegionSwitcher />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        icon="i-material-symbols-language"
        :label="$t('account_page_locale')"
      >
        <div
          class="text-sm text-muted"
          v-text="localeLabel"
        />

        <template #right>
          <LocaleSwitcher />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="!isApp"
        icon="i-material-symbols-payments-outline-rounded"
        :label="$t('account_page_payment_currency')"
      >
        <div
          class="text-sm text-muted"
          v-text="currencyLabel"
        />

        <template #right>
          <CurrencySwitcher />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="isPlusFeatureVisible"
        icon="i-material-symbols-dark-mode-outline-rounded"
        :label="$t('account_page_color_mode')"
      >
        <div
          v-if="user?.isLikerPlus"
          class="text-sm text-muted"
          v-text="colorModeLabel"
        />

        <template #right>
          <ColorModeSwitcher v-if="user?.isLikerPlus" />
          <UButton
            v-else
            :label="$t('account_page_upgrade_to_plus')"
            icon="i-material-symbols-lock-outline"
            variant="solid"
            color="primary"
            :to="localeRoute({ name: 'member', query: { ll_medium: 'color-mode' } })"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="!isApp"
        icon="i-material-symbols-18-up-rating-outline-rounded"
        :label="$t('account_page_adult_content')"
      >
        <div
          class="text-sm text-muted"
          v-text="$t('account_page_adult_content_description')"
        />

        <template #right>
          <USwitch
            :model-value="isAdultContentEnabled"
            @update:model-value="handleAdultContentToggle"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { AccountAdultContentConfirmModal } from '#components'

const { t: $t, locale } = useI18n()
const { user } = useUserSession()
const localeRoute = useLocaleRoute()
const { isApp } = useAppDetection()

const { locales } = useAutoLocale()
const { regionLabel } = useRegionOptions()
const { currency, options: currencyOptions } = usePaymentCurrency()
const { preference: colorModePreference, options: colorModeOptions } = useColorModeSync()

const localeLabel = computed(() => {
  const found = locales.value.find(l => (typeof l === 'string' ? l : l.code) === locale.value)
  if (!found) return ''
  return typeof found === 'string' ? found : found.name
})
const currencyLabel = computed(
  () => currencyOptions.value.find(o => o.value === currency.value)?.label ?? '',
)
const colorModeLabel = computed(
  () => colorModeOptions.value.find(o => o.value === colorModePreference.value)?.label ?? '',
)

const isPlusFeatureVisible = usePlusFeatureVisibility()

const isAdultContentEnabled = useAdultContentSetting()
const overlay = useOverlay()
const adultContentConfirmModal = overlay.create(AccountAdultContentConfirmModal)

function handleAdultContentToggle(value: boolean) {
  if (value) {
    adultContentConfirmModal.open({
      onConfirm: () => {
        isAdultContentEnabled.value = true
      },
    })
  }
  else {
    isAdultContentEnabled.value = false
  }
}
</script>
