<template>
  <nav class="lg:hidden bg-white border-t border-[#EBEBEB] fixed bottom-0 left-0 right-0 pb-safe pr-[68px]">
    <ul class="flex justify-around items-center min-h-14">
      <li
        v-for="item in menuItems"
        :key="item.label"
        class="flex-1"
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
        />
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const route = useRoute()
const getRouteBaseName = useRouteBaseName()

const menuItems = computed(() => [
  {
    label: $t('tab_bar_store'),
    to: { name: 'store' },
    icon: 'storefront-outline',
    iconActive: 'storefront',
  },
  {
    label: $t('tab_bar_shelf'),
    to: { name: 'shelf' },
    icon: 'auto-stories-outline',
    iconActive: 'auto-stories',
  },
  {
    label: $t('tab_bar_user'),
    to: { name: 'account' },
    icon: 'person-outline-rounded',
    iconActive: 'person-rounded',
  },
].map((tab) => {
  const isActive = getRouteBaseName(route) === tab.to.name
  return {
    ...tab,
    to: localeRoute(tab.to),
    icon: `i-material-symbols-${isActive ? tab.iconActive : tab.icon}`,
    isActive,
  }
}))
</script>
