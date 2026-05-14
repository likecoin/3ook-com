<template>
  <UButton
    :label="label"
    :icon="icon"
    :to="to"
    :aria-label="ariaLabel"
    variant="outline"
    :ui="customizedUI"
  />
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(defineProps<{
  label?: string
  icon?: string
  to?: RouteLocationRaw
  ariaLabel?: string
  isActive?: boolean
  isStatic?: boolean
}>(), {
  isActive: false,
  isStatic: false,
})

const BUTTON_CLASS_BASE = [
  'rounded-full',
  'transition-all',
  '!ring-theme-black dark:!ring-muted',
]
const BUTTON_CLASS_ACTIVE = [
  'bg-theme-black dark:bg-theme-cyan',
  'hover:bg-theme-black/80 hover:dark:bg-theme-cyan/80',
  'text-theme-cyan dark:text-theme-black',
]
const BUTTON_CLASS_INACTIVE = [
  'bg-(--app-bg)',
  'hover:bg-accented/80 hover:dark:bg-muted/80',
]

const customizedUI = computed(() => {
  const base: string[] = [
    ...BUTTON_CLASS_BASE,
    ...(props.isActive ? BUTTON_CLASS_ACTIVE : BUTTON_CLASS_INACTIVE),
  ]
  if (props.label) {
    base.push('px-2.5', 'laptop:px-4')
  }
  if (props.isStatic) {
    base.push('pointer-events-none')
  }
  return {
    base,
    label: ['text-sm', 'laptop:text-base'],
    leadingIcon: ['laptop:size-6', 'translate-y-[1px]'],
  }
})
</script>
