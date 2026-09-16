<template>
  <section
    v-if="hasLoggedIn && isPlusFeatureVisible"
    class="space-y-3"
  >
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        v-if="hasLoggedIn"
        icon="i-material-symbols-diamond-outline-rounded"
        :label="$t('account_page_subscription')"
      >
        <div
          class="text-sm/5"
          v-text="subscriptionStateLabel"
        />

        <template
          v-if="likerPlusManageMode !== 'none'"
          #right
        >
          <div
            v-if="likerPlusManageMode === 'store-info'"
            class="text-sm text-muted text-right"
            v-text="$t('account_page_manage_on_device')"
          />
          <UButton
            v-else
            :label="likerPlusButtonLabel"
            :variant="user?.isLikerPlus ? 'outline' : 'solid'"
            :color="user?.isLikerPlus ? 'neutral' : 'primary'"
            :loading="isOpeningBillingPortal || isManagingSubscription"
            @click="handleLikerPlusButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="hasLoggedIn && isCivicOfferable"
        icon="i-material-symbols-group-outline-rounded"
        :label="$t('account_page_civic_upgrade')"
      >
        <div
          class="text-sm/5"
          v-text="$t('account_page_civic_upgrade_description')"
        />

        <template #right>
          <UButton
            :label="$t('account_page_civic_upgrade_button')"
            icon="i-material-symbols-lock-outline"
            color="primary"
            :to="civicUpgradeRoute"
            @click="handleUpgradeToCivicButtonClick"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="canDowngradeToPlus"
        icon="i-material-symbols-arrow-downward-rounded"
        :label="$t('account_page_plus_downgrade')"
      >
        <div
          class="text-sm/5"
          v-text="hasPendingPlusDowngrade
            ? $t('account_page_plus_downgrade_pending')
            : $t('account_page_plus_downgrade_description')"
        />

        <template
          v-if="!hasPendingPlusDowngrade"
          #right
        >
          <UButton
            :label="$t('account_page_plus_downgrade_button')"
            variant="outline"
            color="neutral"
            @click="handleOpenDowngradeModal"
          />
        </template>
      </AccountSettingsItem>

      <AccountSettingsItem
        v-if="hasLoggedIn"
        icon="i-material-symbols-record-voice-over-outline"
        :label="$t('tts_custom_voice_section_title')"
      >
        <div
          v-if="hasCustomVoice"
          class="text-sm text-muted"
          v-text="customVoice?.voiceName"
        />

        <template #right>
          <UButton
            v-if="user?.isLikerPlus"
            :label="hasCustomVoice ? $t('tts_custom_voice_change_button') : $t('account_page_create_custom_voice_button')"
            variant="outline"
            color="neutral"
            @click="handleOpenCustomVoiceModal"
          />
          <UButton
            v-else
            ref="customVoiceUpsell"
            :label="$t('account_page_upgrade_to_plus')"
            icon="i-material-symbols-lock-outline"
            variant="solid"
            color="primary"
            :to="localeRoute({ name: 'member', query: { ll_medium: 'custom-voice' } })"
            @click="handleCustomVoiceUpsellClick"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { CustomVoiceUploadModal, PlusDowngradeModal } from '#components'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()

const isPlusFeatureVisible = usePlusFeatureVisibility()

const {
  subscriptionStateLabel,
  likerPlusButtonLabel,
  likerPlusManageMode,
  isCivicOfferable,
  canDowngradeToPlus,
  isOpeningBillingPortal,
  isManagingSubscription,
  handleLikerPlusButtonClick,
} = usePlusManagement()

const { likerPlusPeriod, hasPendingPlusDowngrade } = useSubscription()

// Send the upgrade to the pricing page — the surface that shows Civic's
// benefits and price with an explicit CTA. Preselect the billing period
// (yearly for non-members) and Civic, which the page won't default to.
const civicUpgradeRoute = computed(() => localeRoute({
  name: 'member',
  query: {
    plan: likerPlusPeriod.value === 'month' ? 'monthly' : 'yearly',
    tier: 'civic',
  },
}))

function handleUpgradeToCivicButtonClick() {
  useLogEvent('account_civic_upgrade_button_click')
}

const overlay = useOverlay()
const downgradeModal = overlay.create(PlusDowngradeModal)

function handleOpenDowngradeModal() {
  useLogEvent('account_plus_downgrade_button_click')
  downgradeModal.open()
}

const { handlePlusUpsellClick: handleCustomVoiceUpsellClick } = usePlusUpsellSlot({
  templateRef: 'customVoiceUpsell',
  slot: 'custom-voice',
  source: 'account-page',
})

const { customVoice, hasCustomVoice } = useCustomVoice()
const customVoiceModal = overlay.create(CustomVoiceUploadModal)

function handleOpenCustomVoiceModal() {
  customVoiceModal.open({
    existingVoice: customVoice.value,
  })
}
</script>
