<template>
  <UModal
    :title="title"
    :description="description"
    :dismissible="dismissible"
    :fullscreen="fullscreen"
    :close="close"
    :ui="mergedUI"
  >
    <template
      v-if="$slots.title"
      #title
    >
      <slot name="title" />
    </template>
    <template
      v-if="$slots.body"
      #body
    >
      <slot name="body" />
    </template>
    <template #footer>
      <template v-if="actions?.length">
        <UButton
          v-for="(action, index) in actions"
          :key="index"
          v-bind="getButtonProps(action)"
          @click="handleAction(action, index)"
        />
      </template>
      <UButton
        v-else
        :label="closeButtonLabel ?? $t('common_close')"
        color="neutral"
        variant="outline"
        @click="emit('close')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {
  ModalProps as UModalProps,
  ButtonProps as UButtonProps,
} from '@nuxt/ui'

export type BaseModalAction = UButtonProps & {
  // Resolved as `modal.open(...).result` when this button is clicked.
  // Falls back to the action's `label`, then its index.
  result?: unknown
}

interface BaseModalProps {
  title?: UModalProps['title']
  description?: UModalProps['description']
  dismissible?: UModalProps['dismissible']
  fullscreen?: UModalProps['fullscreen']
  close?: UModalProps['close']
  ui?: UModalProps['ui']
  actions?: BaseModalAction[]
  closeButtonLabel?: string
}

const props = defineProps<BaseModalProps>()
const emit = defineEmits<{ close: [result?: unknown] }>()
const { t: $t } = useI18n()

const mergedUI = computed<UModalProps['ui']>(() => ({
  footer: 'flex justify-end gap-2',
  ...(props.ui ?? {}),
}))

function getButtonProps(action: BaseModalAction): UButtonProps {
  const { result: _result, ...buttonProps } = action
  return buttonProps
}

function handleAction(action: BaseModalAction, index: number) {
  emit('close', action.result ?? action.label ?? index)
}
</script>
