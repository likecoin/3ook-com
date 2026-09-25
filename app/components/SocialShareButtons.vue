<template>
  <ul class="flex items-center gap-2">
    <li
      v-for="button in buttons"
      :key="button.key"
    >
      <UTooltip
        :delay-duration="0"
        :text="button.label"
      >
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          :icon="button.icon"
          :aria-label="button.label"
          :ui="{ base: 'p-2 rounded-full' }"
          @click="emit('select', button.key)"
        />
      </UTooltip>
    </li>
  </ul>
</template>

<script setup lang="ts">
defineProps({
  buttons: {
    type: Array as PropType<SocialShareButton[]>,
    default: () => [],
  },
})

const emit = defineEmits<{ select: [key: string] }>()
</script>
