<template>
  <header class="w-full max-w-[1440px] mx-auto">
    <nav class="flex justify-between items-stretch min-h-[56px] px-5 2xl:px-14">
      <div class="flex justify-start items-center flex-1 text-(--ui-primary) gap-12">
        <AppLogo :height="16" />

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
            >
              <component
                :is="item.labelZh"
                v-if="locale === 'zh-Hant'"
                class="!w-auto !h-[18px]"
              />
              <span v-else>
                {{ item.label }}
              </span>
            </ULink>
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
import StoreZhIcon from '~/assets/images/bookstore-header-zh.svg'
import ShelfZhIcon from '~/assets/images/bookshelf-header-zh.svg'

const props = defineProps({
  isConnectHidden: Boolean,
})

const { t: $t } = useI18n()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const { locale } = useI18n()

const menuItems = computed(() =>
  [
    {
      label: $t('app_header_store'),
      to: { name: 'store' },
      labelZh: StoreZhIcon,
    },
    {
      label: $t('app_header_shelf'),
      to: { name: 'shelf' },
      labelZh: ShelfZhIcon,
    },
    { label: $t('app_header_user'), to: { name: 'account' } },
  ].map(item => ({
    ...item,
    to: localeRoute(item.to),
    isActive: getRouteBaseName(route) === item.to.name,
  })),
)
</script>
