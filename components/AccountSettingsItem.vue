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

        $slots.default && $slots.right ? 'col-span-full' : 'col-span-4',
        'phone:col-span-3',

        'phone:min-h-8',
        { 'min-h-8': !$slots.default || !$slots.right },

        'text-muted',
      ]"
    >
      <UIcon
        :name="icon"
        class="size-5 shrink-0 mr-2"
      />

      <span
        class="text-sm font-semibold whitespace-nowrap"
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
        !$slots.default && $slots.right ? 'justify-end' : 'justify-between',

        // Span full width in mobile if there are both default and right slots
        $slots.default && $slots.right ? 'col-span-full' : 'col-span-6',
        'phone:col-span-7',

        gapClass,
      ]"
    >
      <div
        v-if="$slots.default"
        :class="[
          'flex',
          'items-center',
          'grow',

          // Align right if there is no right slot in mobile
          { 'max-phone:justify-end max-phone:text-right': !$slots.right },
        ]"
      >
        <slot name="default" />
      </div>

      <div
        v-if="$slots.right"
        class="flex phone:justify-end items-center"
      >
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})

const gapClass = 'gap-x-3 gap-y-1'
</script>
