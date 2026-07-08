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
        v-if="hasLoggedIn && !isApp"
        icon="i-material-symbols-featured-seasonal-and-gifts-rounded"
        :label="$t('account_page_gift_plus')"
      >
        <div
          class="text-sm/5"
          v-text="$t('account_page_gift_plus_description')"
        />

        <template #right>
          <UButton
            :label="$t('account_page_gift_plus_button')"
            color="primary"
            :to="localeRoute({ name: 'gift-plus' })"
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
            :label="$t('account_page_upgrade_to_plus')"
            icon="i-material-symbols-lock-outline"
            variant="solid"
            color="primary"
            :to="localeRoute({ name: 'member', query: { ll_medium: 'custom-voice' } })"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
import { CustomVoiceUploadModal } from '#components'

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const { isApp } = useAppDetection()

const isPlusFeatureVisible = usePlusFeatureVisibility()

const {
  subscriptionStateLabel,
  likerPlusButtonLabel,
  likerPlusManageMode,
  isOpeningBillingPortal,
  isManagingSubscription,
  handleLikerPlusButtonClick,
} = usePlusManagement()

const { customVoice, hasCustomVoice } = useCustomVoice()
const overlay = useOverlay()
const customVoiceModal = overlay.create(CustomVoiceUploadModal)

function handleOpenCustomVoiceModal() {
  customVoiceModal.open({
    existingVoice: customVoice.value,
  })
}
</script>
