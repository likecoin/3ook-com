<template>
  <div
    :class="[
      'grid',
      'grid-cols-10',
      'justify-between',
      'items-center',
      'flex-wrap',
      gapClass,
      'px-4',
      'py-3',
    ]"
  >
    <div
      :class="[
        'flex',
        'items-center',
        'shrink-0',
        'gap-2',

        shouldStackColumnsOnMobile ? 'col-span-full' : 'col-span-4',
        'phone:col-span-3',

        'phone:min-h-8',
        { 'min-h-8': !shouldStackColumnsOnMobile },

        'text-muted',
      ]"
    >
      <slot
        v-if="$slots['label-prepend']"
        name="label-prepend"
      />
      <UIcon
        v-else-if="icon"
        :name="icon"
        class="size-5 shrink-0"
      />

      <span
        class="text-sm font-semibold"
        v-text="label"
      />

      <slot name="label-append" />
    </div>

    <div
      :class="[
        'flex',
        'items-center',
        'flex-wrap',

        // Align right slot to the right if there is no default slot
        !hasDefaultContent && hasRightContent ? 'justify-end' : 'justify-between',

        // Span full width in mobile if there are both default and right slots
        shouldStackColumnsOnMobile ? 'col-span-full' : 'col-span-6',
        'phone:col-span-7',

        gapClass,
      ]"
    >
      <div
        v-if="hasDefaultContent"
        :class="[
          'flex',
          'items-center',
          'grow',

          // Align right if there is no right slot in mobile
          { 'max-phone:justify-end max-phone:text-right': !hasRightContent },
        ]"
      >
        <slot name="default" />
      </div>

      <div
        v-if="hasRightContent"
        class="flex phone:justify-end items-center"
      >
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Comment, Text, type Slot } from 'vue'

defineProps({
  icon: {
    type: String,
  },
  label: {
    type: String,
    required: true,
  },
})

const slots = useSlots()

function checkSlotHasContent(slot?: Slot) {
  return !!slot?.().some((vnode) => {
    // a `v-if="false"` slot still renders a comment node
    if (vnode.type === Comment) return false
    if (vnode.type === Text) return !!String(vnode.children ?? '').trim()
    return true
  })
}

const hasDefaultContent = computed(() => checkSlotHasContent(slots.default))
const hasRightContent = computed(() => checkSlotHasContent(slots.right))

const shouldStackColumnsOnMobile = computed(() => hasDefaultContent.value && hasRightContent.value)

const gapClass = 'gap-x-3 gap-y-1'
</script>
