<template>
  <slot v-if="isHidden" />
  <div
    v-else
    class="bg-theme-cyan p-3 laptop:pt-5 rounded-xl"
  >
    <div class="hidden laptop:flex items-center gap-2 mb-4 laptop:mb-6 text-theme-black">
      <UIcon
        name="i-material-symbols-celebration-outline-rounded"
        :size="24"
      />
      <span
        class="font-bold"
        v-text="$t('subscribe_plus_alert_limited_offer')"
      />
    </div>

    <slot />
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    isHidden?: boolean
  }>(),
  {
    isHidden: false,
  },
)
</script>
