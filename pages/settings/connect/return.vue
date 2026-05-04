<template>
  <main class="flex items-center justify-center py-16">
    <UProgress animation="carousel">
      <template #indicator>
        <span v-text="$t('settings_connect_return_indicator')" />
      </template>
    </UProgress>
  </main>
</template>

<script setup lang="ts">
const localeRoute = useLocaleRoute()
const { t: $t } = useI18n()

useHead({
  title: $t('settings_connect_return_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})

const target = localeRoute({ name: 'account', query: { action: 'stripe-connect-return' } })
// SSR needs an awaited navigateTo to emit a 302. On the client we
// fire-and-forget: awaiting in <script setup> would suspend this page
// if the target route stalls (e.g. offline).
if (import.meta.server) {
  await navigateTo(target, { replace: true })
}
else {
  navigateTo(target, { replace: true })
}
</script>
