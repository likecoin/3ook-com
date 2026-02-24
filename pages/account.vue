<template>
  <NuxtLayout
    name="default"
    class="relative gap-4 w-full max-w-(--breakpoint-phone) mx-auto"
    :is-footer-visible="isFooterVisible"
    :is-tab-bar-visible="!parentBreadcrumbItem"
  >
    <!-- Sub-page header -->
    <header
      v-if="parentBreadcrumbItem"
      :class="[
        'max-phone:sticky',
        'top-0',
        'z-10',

        'flex',
        'items-center',
        'gap-4',

        'px-4',
        'py-2',
        'max-phone:bg-white',
        'max-phone:border-b',
        'max-phone:border-b-muted',
      ]"
    >
      <UButton
        class="rounded-full"
        icon="i-material-symbols-arrow-back-rounded"
        :to="parentBreadcrumbItem.to"
        variant="subtle"
        color="neutral"
      />

      <UBreadcrumb :items="breadcrumbItems" />
    </header>

    <!-- Top-level header -->
    <header
      v-else-if="hasLoggedIn"
      class="px-4 pt-10"
    >
      <h1
        class="text-2xl font-bold"
        v-text="breadcrumbItems[0]?.label"
      />
    </header>

    <!-- Login Prompt -->
    <aside
      v-if="!hasLoggedIn"
      class="px-4 first:pt-4"
    >
      <UCard :ui="{ header: 'flex justify-center items-center p-4 sm:p-4 bg-theme-black' }">
        <template #header>
          <AppLogo
            :is-icon="false"
            :height="64"
          />
        </template>

        <UButton
          :label="isApp ? $t('account_page_login_app') : $t('account_page_login')"
          :loading="accountStore.isLoggingIn"
          icon="i-material-symbols-login"
          color="primary"
          variant="outline"
          size="xl"
          block
          @click="handleLogin"
        />
      </UCard>
    </aside>

    <NuxtPage class="px-4 phone:grow" />
  </NuxtLayout>
</template>

<script lang="ts" setup>
// NOTE: Set `layout` to false for injecting props into `<NuxtLayout/>`.
definePageMeta({ layout: false })

const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { loggedIn: hasLoggedIn } = useUserSession()
const accountStore = useAccountStore()
const { isApp } = useAppDetection()

const routeName = computed(() => getRouteBaseName(route) || '')

const breadcrumbItems = computed(() => {
  const items = []
  const parts = routeName.value.split('-')

  for (let i = 0; i < parts.length; i++) {
    const itemParts = parts.slice(0, i + 1)
    items.push({
      label: $t(`breadcrumb_${itemParts.join('_')}`),
      to: localeRoute({ name: itemParts.join('-') }),
    })
  }

  return items
})

const parentBreadcrumbItem = computed(() => {
  return breadcrumbItems.value[breadcrumbItems.value.length - 2]
})

const isFooterVisible = computed(() => {
  return routeName.value === 'account'
})

async function handleLogin() {
  await accountStore.login()
}
</script>
