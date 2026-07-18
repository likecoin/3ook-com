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

      <div
        v-if="props.rawMessage"
        class="not-first:mt-4"
      >
        <div class="relative">
          <code
            :class="[CODE_BLOCK_CLASS, { 'pr-10': props.rawStack }]"
            v-text="props.rawMessage"
          />
          <UButton
            v-if="props.rawStack"
            class="absolute bottom-0.5 right-0.5"
            :icon="isStackExpanded ? 'i-material-symbols-expand-less-rounded' : 'i-material-symbols-expand-more-rounded'"
            :aria-label="$t('error_modal_show_details')"
            :aria-expanded="isStackExpanded"
            color="neutral"
            variant="subtle"
            size="xs"
            @click="isStackExpanded = !isStackExpanded"
          />
        </div>

        <UCollapsible
          v-if="props.rawStack"
          v-model:open="isStackExpanded"
        >
          <template #content>
            <code
              :class="[CODE_BLOCK_CLASS, 'mt-2 max-h-48 overflow-y-auto']"
              v-text="props.rawStack"
            />
          </template>
        </UCollapsible>
      </div>

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
  rawStack?: string
  tags?: Array<UBadgeProps>
  actions?: Array<BaseModalAction>
}>()

const emit = defineEmits<{ close: [result?: unknown] }>()

const { t: $t } = useI18n()

const isStackExpanded = ref(false)

watch(() => [props.rawMessage, props.rawStack], () => {
  isStackExpanded.value = false
})

const CODE_BLOCK_CLASS = [
  'block',
  'px-2.5 py-1.5',
  'text-xs font-mono font-medium',
  'rounded-md',
  'border border-accented',
  'bg-elevated',
  'break-all whitespace-pre-wrap',
]

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
