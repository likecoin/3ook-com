<template>
  <div class="flex justify-between items-center flex-wrap gap-2 px-3">
    <div class="flex items-center gap-2 py-2 text-(--ui-text-muted)">
      <UIcon
        :name="icon"
        class="size-5"
      />
      <span
        class="text-sm font-semibold"
        v-text="label"
      />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})
</script>
