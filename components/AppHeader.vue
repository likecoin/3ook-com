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
            >{{ item.label }}</ULink>
          </li>
        </ul>
      </div>

      <div class="flex justify-end items-center gap-3 flex-1">
        <UTooltip :text="$t('cart_button_tooltip_text')">
          <UChip
            :show="shoppingCartStore.count > 0"
            :text="shoppingCartStore.count"
            size="3xl"
            inset
            :ui="{ base: 'text-(--app-bg) text-[8px] font-bold ring-(--app-bg)' }"
          >
            <UButton
              icon="i-material-symbols-shopping-bag-outline"
              variant="link"
              :to="localeRoute({ name: 'cart' })"
              @click="handleCartButtonClick"
            />
          </UChip>
        </UTooltip>

        <template v-if="!props.isConnectHidden">
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
        </template>
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

const shoppingCartStore = useShoppingCartStore()

const menuItems = computed(() => [
  { label: $t('app_header_store'), to: { name: 'store' } },
  { label: $t('app_header_shelf'), to: { name: 'shelf' } },
].map(item => ({
  ...item,
  to: localeRoute(item.to),
  isActive: getRouteBaseName(route) === item.to.name,
})))

onMounted(() => {
  shoppingCartStore.loadItemsFromStorage()
})

function handleCartButtonClick() {
  useTrackEvent('view_cart')
}
</script>
