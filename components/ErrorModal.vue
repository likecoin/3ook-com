<template>
  <UModal
    :close="{
      color: 'neutral',
      variant: 'outline',
      class: 'rounded-full',
      onClick: () => emit('close'),
    }"
    :ui="{
      title: 'flex items-center gap-2',
      footer: 'flex justify-end gap-2',
    }"
  >
    <template #title>
      <UIcon
        class="text-red-500"
        name="material-symbols-error"
        size="24"
      />

      <h2
        class="text-(--ui-text-highlighted) font-semibold"
        v-text="title || $t('error_modal_title')"
      />
    </template>
    <template #body>
      <p
        v-if="props.description"
        class="text-(--ui-text-muted) text-sm"
        v-text="description"
      />

      <code
        v-if="props.rawMessage"
        class="block not-first:mt-4 px-2 py-1 text-xs font-mono font-medium rounded-md border border-gray-300 bg-gray-100 break-all whitespace-pre-wrap"
        v-text="rawMessage"
      />
    </template>

    <template
      v-if="props.actions?.length"
      #footer
    >
      <UButton
        :label="$t('error_modal_footer_cancel')"
        color="neutral"
        variant="outline"
        @click="() => emit('close')"
      />

      <UButton
        v-for="(action, index) in props.actions"
        :key="index"
        v-bind="action"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ButtonProps as UButtonProps } from '@nuxt/ui'

const emit = defineEmits(['close'])

const props = defineProps<{
  title: string
  description: string
  rawMessage: string
  actions?: Array<UButtonProps>
}>()
const { t: $t } = useI18n()
</script>
