<template>
  <section
    v-if="hasLoggedIn && isIAPSupported && !user?.isLikerPlus"
    class="space-y-3"
  >
    <UCard :ui="{ body: '!p-0 divide-y-1 divide-(--ui-border)' }">
      <AccountSettingsItem
        icon="i-material-symbols-sync-rounded"
        :label="$t('account_restore_purchases_label')"
      >
        <div
          class="text-sm/5"
          v-text="$t('account_restore_purchases_description')"
        />

        <template #right>
          <UButton
            :label="$t('account_restore_purchases_button')"
            variant="outline"
            color="neutral"
            :loading="isRestoringPurchases"
            @click="handleRestorePurchases"
          />
        </template>
      </AccountSettingsItem>
    </UCard>
  </section>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()
const { handleError } = useErrorHandler()
const toast = useToast()
const { isIAPSupported, restore: restorePurchases } = useNativeIAP()

const isRestoringPurchases = ref(false)

// App Store / Play account-based restore: re-sync entitlements from the store,
// then refresh the backend session so `isLikerPlus` reflects the result.
async function handleRestorePurchases() {
  if (isRestoringPurchases.value) return
  // RevenueCat is keyed by likerId (the backend internal user id), so a missing
  // likerId can't attribute the restore to the right user — gate it like checkout.
  if (!user.value?.likerId) {
    toast.add({
      title: $t('pricing_page_liker_id_required'),
      description: $t('pricing_page_liker_id_required_description'),
      color: 'warning',
    })
    return
  }
  try {
    isRestoringPurchases.value = true
    const result = await restorePurchases(user.value.likerId)
    if (result.status !== 'success') {
      // Route through a recognized handler so the modal shows only the localized
      // copy; otherwise handleError surfaces the raw native/English message
      // (e.g. "Restore timed out") in its debug code block.
      await handleError(new Error('RESTORE_PURCHASES_FAILED'), {
        customHandlerMap: {
          RESTORE_PURCHASES_FAILED: { description: $t('error_restore_purchases_failed') },
        },
      })
      return
    }
    // result.isPlus is RevenueCat's device-side truth for whether this store
    // account holds the entitlement — trust it for the toast so a lagging
    // backend webhook doesn't show a false "nothing to restore". The session
    // refresh syncs isLikerPlus (which gates features) once the webhook lands.
    await accountStore.refreshSessionInfo()
    const restored = result.isPlus ?? user.value?.isLikerPlus ?? false
    toast.add({
      title: restored
        ? $t('account_restore_purchases_success')
        : $t('account_restore_purchases_none'),
      color: restored ? 'success' : 'info',
    })
  }
  catch (error) {
    handleError(error)
  }
  finally {
    isRestoringPurchases.value = false
  }
}
</script>
