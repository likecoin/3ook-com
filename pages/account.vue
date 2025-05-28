<template>
  <NuxtLayout
    name="default"
    :is-footer-visible-in-mobile="true"
  >
    <AppHeader :is-connect-hidden="false" />

    <main class="w-full max-w-xl mx-auto p-4 space-y-4">
      <div
        v-if="hasLoggedIn"
        class="flex items-center gap-4 px-2"
      >
        <UAvatar
          class="bg-white border-[#EBEBEB]"
          :src="user?.avatar"
          :alt="user?.displayName"
          icon="i-material-symbols-person-2-rounded"
          size="3xl"
        />
        <div
          class="font-semibold"
          v-text="user?.displayName || user?.likerId"
        />
      </div>
      <UCard v-else>
        <UButton
          :label="$t('user_page_login')"
          :loading="accountStore.isLoggingIn"
          variant="outline"
          block
          @click="handleLogin"
        />
      </UCard>

      <section class="space-y-3 pt-4">
        <h2
          class="px-4 text-lg font-bold"
          v-text="$t('user_page_account_title')"
        />

        <UCard :ui="{ body: '!px-3 space-y-4' }">
          <div class="flex justify-between flex-wrap gap-2 px-3">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-material-symbols-check-box-outline-blank"
                class="size-5"
              />
              <span
                class="text-sm"
                v-text="$t('user_page_liker_id')"
              />
            </div>

            <div
              class="text-sm font-mono"
              v-text="user?.likerId"
            />
          </div>

          <div class="flex justify-between flex-wrap gap-2 px-3">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-material-symbols-check-box-outline-blank"
                class="size-5"
              />
              <span
                class="text-sm"
                v-text="$t('user_page_evm_wallet')"
              />
            </div>

            <div
              class="text-xs font-mono"
              v-text="user?.evmWallet"
            />
          </div>

          <div class="flex justify-between flex-wrap gap-2 px-3">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-material-symbols-check-box-outline-blank"
                class="size-5"
              />
              <span
                class="text-sm"
                v-text="$t('user_page_cosmos_wallet')"
              />
            </div>

            <div
              class="text-xs font-mono"
              v-text="user?.likeWallet"
            />
          </div>
        </UCard>
      </section>

      <section class="space-y-3 pt-4">
        <h2
          class="px-4 text-lg font-bold"
          v-text="$t('user_page_settings_and_help_title')"
        />

        <UCard :ui="{ body: '!px-3 space-y-4' }">
          <AccountSettingsItem
            icon="i-material-symbols-language"
            :label="$t('user_page_locale')"
          >
            <LocaleSwitcher :is-icon-hidden="true" />
          </AccountSettingsItem>

          <AccountSettingsItem
            icon="i-material-symbols-arrow-split-rounded"
            :label="$t('user_page_evm_switch')"
          >
            <USwitch
              v-model="accountStore.isEVMMode"
              :disabled="!user?.likeWallet"
            />
          </AccountSettingsItem>

          <UButton
            :label="$t('user_page_contact_support')"
            href="https://go.crisp.chat/chat/embed/?website_id=5c009125-5863-4059-ba65-43f177ca33f7"
            target="_blank"
            variant="link"
            leading-icon="i-material-symbols-contact-support"
            trailing-icon="i-material-symbols-share-windows-rounded"
            color="neutral"
            size="lg"
            block
          />

          <UButton
            :label="$t('user_page_faq')"
            href="https://docs.like.co/zh/depub/ebook"
            target="_blank"
            variant="link"
            leading-icon="i-material-symbols-question-mark-rounded"
            trailing-icon="i-material-symbols-share-windows-rounded"
            color="neutral"
            size="lg"
            block
          />

          <UButton
            :label="$t('user_page_publish_book')"
            href="https://publish.liker.land"
            target="_blank"
            variant="link"
            leading-icon="i-material-symbols-book-4-spark-rounded"
            trailing-icon="i-material-symbols-share-windows-rounded"
            color="neutral"
            size="lg"
            block
          />
        </UCard>
      </section>

      <UButton
        v-if="hasLoggedIn"
        :label="$t('user_page_logout')"
        variant="outline"
        color="error"
        size="lg"
        block
        @click="handleLogout"
      />
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
// NOTE: Set `layout` to false for injecting props into `<NuxtLayout/>`.
definePageMeta({ layout: false })

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const accountStore = useAccountStore()

async function handleLogin() {
  await accountStore.login()
}

async function handleLogout() {
  await accountStore.logout()
}
</script>
