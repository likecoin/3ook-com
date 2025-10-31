<template>
  <div class="font-semibold">
    <span v-text="value" />
    <span>&nbsp;{{ currency }}</span>
  </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
  value?: string | number
  currency?: string
}>(), {
  value: 0,
  currency: 'LIKE',
})
</script>
