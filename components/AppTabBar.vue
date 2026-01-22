<template>
  <nav class="bg-white dark:bg-theme-black border-t border-muted fixed bottom-0 left-0 right-0 pb-safe">
    <ul class="flex justify-around items-center w-full max-w-md min-h-14 mx-auto">
      <li
        v-for="item in menuItems"
        :key="item.label"
        class="flex-1"
      >
        <NuxtLink
          v-if="item.key === 'account' && hasLoggedIn"
          class="relative flex justify-center items-center"
          :to="item.to"
        >
          <UAvatar
            :class="[
              'bg-white',
              item.isActive
                ? 'border-2 border-theme-black dark:border-theme-white'
                : 'border border-muted',
            ]"
            :src="user?.avatar"
            :alt="user?.displayName"
            icon="i-material-symbols-person-2-rounded"
            size="lg"
          />
          <UBadge
            v-if="user?.isLikerPlus"
            class="absolute bottom-0 translate-y-1/2"
            size="xs"
            :variant="item.isActive ? 'solid' : 'outline'"
            :ui="{
              base: [
                'rounded-full',
                item.isActive
                  ? 'bg-theme-black dark:bg-theme-cyan text-theme-cyan dark:text-theme-black'
                  : 'bg-theme-white dark:bg-theme-black',
                'font-bold',
              ],
            }"
          >PLUS</UBadge>
        </NuxtLink>
        <UButton
          v-else
          class="flex-col gap-0"
          :label="item.label"
          :icon="item.icon"
          :color="item.isActive ? 'primary' : 'neutral'"
          variant="link"
          :to="item.to"
          size="xl"
          block
          :ui="{ label: 'text-xs' }"
        >
          <template
            v-if="item.labelGraphic"
            #default
          >
            <component
              :is="item.labelGraphic"
              style="width: auto; height: 12px;"
            />
          </template>
        </UButton>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const { getLabelGraphic } = useGraphicLabel()
const { loggedIn: hasLoggedIn, user } = useUserSession()

const menuItems = computed(() =>
  [
    {
      key: 'store',
      label: $t('tab_bar_store'),
      icon: 'i-material-symbols-storefront-outline',
      iconActive: 'i-material-symbols-storefront',
    },
    {
      key: 'shelf',
      label: $t('tab_bar_shelf'),
      icon: 'i-material-symbols-auto-stories-outline',
      iconActive: 'i-material-symbols-auto-stories',
    },
    {
      key: 'account',
      label: $t('tab_bar_user'),
      icon: 'i-material-symbols-person-outline-rounded',
      iconActive: 'i-material-symbols-person-rounded',
    },
  ].map((tab) => {
    const isActive = getRouteBaseName(route)?.startsWith(tab.key)
    const to = localeRoute({ name: tab.key })
    return {
      key: tab.key,
      label: tab.label,
      to,
      icon: isActive ? tab.iconActive : tab.icon,
      isActive,
      labelGraphic: getLabelGraphic(tab.key),
    }
  }),
)
</script>
