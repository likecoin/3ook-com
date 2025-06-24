<template>
  <nav class="lg:hidden bg-white border-t border-[#EBEBEB] fixed bottom-0 left-0 right-0 pb-safe">
    <ul class="flex justify-around items-center min-h-14">
      <li
        v-for="item in menuItems"
        :key="item.label"
        class="flex-1"
      >
        <UButton
          class="flex-col gap-0"
          :icon="item.icon"
          :color="item.isActive ? 'primary' : 'neutral'"
          variant="link"
          :to="item.to"
          size="xl"
          block
          :ui="{ label: 'text-xs' }"
        >
          <template #default>
            <component
              :is="item.labelGraphic"
              v-if="item.labelGraphic"
              style="width: auto; height: 12px;"
            />
            <span
              v-else
              class="text-xs"
            >{{ item.label }}</span>
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
const { getLabelComponent } = useGraphicLabel()

const rawMenuItems = [
  {
    key: 'store',
    labelKey: 'tab_bar_store',
    icon: 'storefront-outline',
    iconActive: 'storefront',
  },
  {
    key: 'shelf',
    labelKey: 'tab_bar_shelf',
    icon: 'auto-stories-outline',
    iconActive: 'auto-stories',
  },
  {
    key: 'account',
    labelKey: 'tab_bar_user',
    icon: 'person-outline-rounded',
    iconActive: 'person-rounded',
  },
]

const menuItems = computed(() =>
  rawMenuItems.map((tab) => {
    const isActive = getRouteBaseName(route) === tab.key
    const to = localeRoute({ name: tab.key })
    return {
      label: $t(tab.labelKey),
      to,
      icon: `i-material-symbols-${isActive ? tab.iconActive : tab.icon}`,
      isActive,
      labelGraphic: getLabelComponent(tab.key),
    }
  }),
)
</script>
