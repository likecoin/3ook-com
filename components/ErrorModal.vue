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
        :class="iconColorClass"
        :name="iconName"
        size="24"
      />

      <h2
        class="text-highlighted font-semibold"
        v-text="title || $t('error_modal_title')"
      />
    </template>
    <template
      v-if="props.description || props.rawMessage || props.tags?.length"
      #body
    >
      <p
        v-if="props.description"
        class="text-muted text-sm"
        v-text="description"
      />

      <code
        v-if="props.rawMessage"
        class="block not-first:mt-4 px-2 py-1 text-xs font-mono font-medium rounded-md border border-accented bg-elevated break-all whitespace-pre-wrap"
        v-text="rawMessage"
      />

      <ul
        v-if="props.tags?.length"
        class="flex flex-wrap mt-4 gap-2"
      >
        <li
          v-for="(tag, index) in props.tags"
          :key="index"
        >
          <UBadge
            color="neutral"
            variant="subtle"
            size="sm"
            v-bind="tag"
          />
        </li>
      </ul>
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
        @click="() => emit('close')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {
  BadgeProps as UBadgeProps,
  ButtonProps as UButtonProps,
} from '@nuxt/ui'

const emit = defineEmits(['close'])

const props = defineProps<{
  level?: ErrorLevel
  title?: string
  description?: string
  rawMessage?: string
  tags?: Array<UBadgeProps>
  actions?: Array<UButtonProps>
}>()
const { t: $t } = useI18n()

const iconColorClass = computed(() => {
  switch (props.level) {
    case 'info':
      return 'text-(--ui-info)'
    case 'warning':
      return 'text-(--ui-warning)'
    case 'error':
    default:
      return 'text-(--ui-error)'
  }
})

const iconName = computed(() => {
  switch (props.level) {
    case 'info':
      return 'i-material-symbols-info-rounded'
    case 'warning':
      return 'i-material-symbols-warning-rounded'
    case 'error':
    default:
      return 'i-material-symbols-error-circle-rounded'
  }
})
</script>
