<template>
  <div class="font-semibold">
    <span v-text="value" />
    <span>&nbsp;LIKE</span>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  value?: string | number
}>(), {
  value: 0,
})
</script>
