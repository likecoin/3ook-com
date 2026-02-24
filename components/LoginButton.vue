<template>
  <UButton
    leading-icon="i-material-symbols-login-rounded"
    :label="isApp ? $t('login_button_app') : $t('login_button')"
    variant="outline"
    size="lg"
    :loading="accountStore.isLoggingIn"
    :disabled="hasLoggedIn"
    @click="handleLogin"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const accountStore = useAccountStore()
const { loggedIn: hasLoggedIn } = useUserSession()
const { isApp } = useAppDetection()

async function handleLogin() {
  if (hasLoggedIn.value) return
  await accountStore.login()
}
</script>
