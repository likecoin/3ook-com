<template>
  <nav class="bg-white border-t border-[#EBEBEB] fixed bottom-0 left-0 right-0 pb-safe">
    <ul class="flex justify-around items-center min-h-14">
      <li
        v-for="item in menuItems"
        :key="item.label"
      >
        <UButton
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
      <li v-if="hasLoggedIn">
        <NuxtLink
          :to="localeRoute({ name: 'account' })"
          class="flex items-center"
        >
          <UAvatar
            class="bg-white border-[#EBEBEB]"
            :src="user?.avatar"
            :alt="user?.displayName"
            icon="i-material-symbols-person-2-rounded"
            size="lg"
          />
        </NuxtLink>
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

type MenuItemType = {
  key: string
  label: string
  icon: string
  iconActive: string
}

const rawMenuItems = computed((): MenuItemType[] => {
  const items: MenuItemType[] = [
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
  ]

  if (!hasLoggedIn.value) {
    items.push({
      key: 'account',
      label: $t('tab_bar_user'),
      icon: 'i-material-symbols-person-outline-rounded',
      iconActive: 'i-material-symbols-person-rounded',
    })
  }

  return items
})

const menuItems = computed(() =>
  rawMenuItems.value.map((tab: MenuItemType) => {
    const isActive = getRouteBaseName(route)?.startsWith(tab.key)
    const to = localeRoute({ name: tab.key })
    return {
      label: tab.label,
      to,
      icon: isActive ? tab.iconActive : tab.icon,
      isActive,
      labelGraphic: getLabelGraphic(tab.key),
    }
  }),
)
</script>
