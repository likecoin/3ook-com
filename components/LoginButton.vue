<template>
  <UButton
    leading-icon="i-material-symbols-login-rounded"
    :label="$t('login_button')"
    :loading="userStore.isLoggingIn"
    :disabled="hasLoggedIn"
    @click="handleLogin"
  />
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const userStore = useAccountStore()
const { loggedIn: hasLoggedIn } = useUserSession()

async function handleLogin() {
  if (hasLoggedIn.value) return
  await userStore.login()
}
</script>
