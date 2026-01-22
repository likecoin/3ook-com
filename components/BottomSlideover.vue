<template>
  <slot v-if="isDisabled" />
  <USlideover
    v-else
    v-bind="props"
    v-model:open="open"
    side="bottom"
    :overlay="false"
    :close="{
      color: 'neutral',
      variant: 'soft',
      class: 'rounded-full',
    }"
    :ui="{
      content: 'bottom-safe max-w-(--breakpoint-phone) mx-5 phone:mx-auto mb-5 border border-gray-500 divide-gray-500 rounded-2xl overflow-hidden',
      body: 'relative p-0 sm:p-0 overflow-hidden',
    }"
    @update:open="emit('update:open', $event)"
  >
    <slot />

    <template #body>
      <div
        ref="bodyWrapperElement"
        class=" max-h-[40vh] overflow-y-auto pb-2"
      >
        <slot name="body" />
      </div>
      <div
        :class="[
          ...scrollIndicatorClasses,
          'top-0',
          'bg-gradient-to-b',
          { 'opacity-0': isBodyScrolledToTop },
        ]"
      />
      <div
        :class="[
          ...scrollIndicatorClasses,
          'bottom-0',
          'bg-gradient-to-t',
          { 'opacity-0': isBodyScrolledToBottom },
        ]"
      />
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
  isDisabled?: boolean
}>()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const bodyWrapperElement = useTemplateRef<HTMLDivElement>('bodyWrapperElement')
const { arrivedState: bodyWrapperElementArrivedState } = useScroll(bodyWrapperElement)
const {
  top: isBodyScrolledToTop,
  bottom: isBodyScrolledToBottom,
} = toRefs(bodyWrapperElementArrivedState)

const scrollIndicatorClasses = [
  'absolute',

  'inset-x-0',

  'h-12',

  'from-white',
  'dark:from-black',
  'to-transparent',
  'pointer-events-none',
]
</script>
