<template>
  <header class="w-full max-w-[1440px] mx-auto">
    <nav class="flex justify-between items-stretch min-h-[56px] px-5 2xl:px-14">
      <div class="flex justify-start items-center flex-1 text-(--ui-primary) gap-12">
        <AppLogo class="lg:h-6" />

        <ul class="hidden laptop:flex items-center flex-wrap gap-10 gap-y-1 font-semibold">
          <li
            v-for="item in menuItems"
            :key="item.label"
          >
            <ULink
              :class="[
                'block',
                'leading-8',
                'box-border',
                'border-y',
                'border-t-transparent',
                { 'border-transparent': !item.isActive },
              ]"
              :to="item.to"
            >{{ item.label }}</ULink>
          </li>
        </ul>
      </div>

      <div
        v-if="!props.isConnectHidden"
        class="flex justify-end items-center flex-1"
      >
        <LoginButton v-if="!hasLoggedIn" />
        <NuxtLink
          v-else
          :to="localeRoute({ name: 'account' })"
          class="hidden laptop:flex items-center"
        >
          <UAvatar
            class="bg-white border-[#EBEBEB]"
            :src="user?.avatar"
            :alt="user?.displayName"
            icon="i-material-symbols-person-2-rounded"
            size="xl"
          />
        </NuxtLink>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
const props = defineProps({
  isConnectHidden: Boolean,
})

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()

const menuItems = computed(() => [
  { label: $t('app_header_store'), to: { name: 'store' } },
  { label: $t('app_header_shelf'), to: { name: 'shelf' } },
].map(item => ({
  ...item,
  to: localeRoute(item.to),
  isActive: getRouteBaseName(route) === item.to.name,
})))
</script>
