<template>
  <nav
    :class="[
      'fixed',
      'inset-x-0',
      'bottom-0',
      'z-40',
      isApp ? 'pb-[min(env(safe-area-inset-bottom),18px)]' : 'pb-safe',
      'pointer-events-none',
    ]"
  >
    <div
      :class="[
        'flex',
        'items-center',
        'justify-center',
        'gap-1',

        'w-fit',
        'mx-auto',
        'mb-1',
        'p-1',

        'bg-(--ui-bg)/80',
        'backdrop-blur-sm',
        'rounded-full',
        'ring-1 ring-(--ui-border)',
        'pointer-events-auto',
      ]"
    >
      <template
        v-for="item in menuItems"
        :key="item.key"
      >
        <UButton
          v-if="item.key === 'account' && hasLoggedIn"
          class="justify-center min-w-20 h-13 rounded-full"
          :variant="item.isActive ? 'solid' : 'ghost'"
          color="neutral"
          :to="item.to"
          size="md"
          :aria-label="item.label"
        >
          <template #leading>
            <div class="relative">
              <UAvatar
                class="bg-white ring-1 ring-default border border-default"
                :src="user?.avatar"
                :alt="user?.displayName"
                icon="i-material-symbols-person-2-rounded"
                size="lg"
              />
              <UserAvatarPlusBadge
                v-if="user?.isLikerPlus"
                :color="item.isActive ? 'secondary' : 'primary'"
              />
            </div>
          </template>
        </UButton>
        <UButton
          v-else
          class="flex-col gap-0.75 min-w-20 h-13 py-1 rounded-full text-[11px]"
          :label="item.label"
          :icon="item.icon"
          :variant="item.isActive ? 'solid' : 'ghost'"
          color="neutral"
          :to="item.to"
          size="md"
          :ui="{ leadingIcon: 'size-7', label: 'leading-none' }"
        >
          <template
            v-if="item.labelGraphic"
            #default
          >
            <component
              :is="item.labelGraphic"
              style="width: auto; height: 1em; margin: 0;"
            />
          </template>
        </UButton>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const getRouteBaseNameString = useRouteBaseNameString()
const { getLabelGraphic } = useGraphicLabel()
const { loggedIn: hasLoggedIn, user } = useUserSession()
const { isApp } = useAppDetection()
const isPlusLibraryEnabled = useFeatureFlagEnabled('plus-library')

const menuItems = computed(() => {
  const routeName = getRouteBaseNameString()
  return [
    {
      key: 'store',
      label: $t('tab_bar_store'),
      icon: 'i-material-symbols-storefront-outline',
      iconActive: 'i-material-symbols-storefront',
    },
    // Plus-reading library; only shown once the feature flag resolves true.
    ...(isPlusLibraryEnabled.value === true
      ? [{
          key: 'library',
          label: $t('tab_bar_library'),
          icon: 'i-3ook-com-library-outline-rounded',
          iconActive: 'i-3ook-com-library-rounded',
        }]
      : []),
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
    const isActive = routeName.startsWith(tab.key)
    const to = localeRoute({ name: tab.key })
    return {
      key: tab.key,
      label: tab.label,
      to,
      icon: isActive ? tab.iconActive : tab.icon,
      isActive,
      labelGraphic: getLabelGraphic(tab.key),
    }
  })
})
</script>
