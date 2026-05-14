<template>
  <BaseModal
    :ui="{ title: 'flex items-center gap-2' }"
    :actions="props.actions"
    @close="(result) => emit('close', result)"
  >
    <template #title>
      <UIcon
        :class="levelStyle.colorClass"
        :name="levelStyle.iconName"
        size="24"
      />

      <h2
        class="text-highlighted font-semibold"
        v-text="props.title || $t('error_modal_title')"
      />
    </template>
    <template
      v-if="props.description || props.rawMessage || props.tags?.length"
      #body
    >
      <p
        v-if="props.description"
        class="text-muted text-sm"
        v-text="props.description"
      />

      <code
        v-if="props.rawMessage"
        class="block not-first:mt-4 px-2 py-1 text-xs font-mono font-medium rounded-md border border-accented bg-elevated break-all whitespace-pre-wrap"
        v-text="props.rawMessage"
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
  </BaseModal>
</template>

<script setup lang="ts">
import type { BadgeProps as UBadgeProps } from '@nuxt/ui'

import type { BaseModalAction } from './BaseModal.vue'

const props = defineProps<{
  level?: ErrorLevel
  title?: string
  description?: string
  rawMessage?: string
  tags?: Array<UBadgeProps>
  actions?: Array<BaseModalAction>
}>()

const emit = defineEmits<{ close: [result?: unknown] }>()

const { t: $t } = useI18n()

const LEVEL_STYLES = {
  info: {
    colorClass: 'text-(--ui-info)',
    iconName: 'i-material-symbols-info-rounded',
  },
  warning: {
    colorClass: 'text-(--ui-warning)',
    iconName: 'i-material-symbols-warning-rounded',
  },
  error: {
    colorClass: 'text-(--ui-error)',
    iconName: 'i-material-symbols-error-circle-rounded',
  },
} as const

const levelStyle = computed(() => LEVEL_STYLES[props.level ?? 'error'])
</script>
