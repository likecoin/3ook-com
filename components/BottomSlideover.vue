<template>
  <slot v-if="isDisabled" />
  <USlideover
    v-else
    v-bind="props"
    v-model:open="open"
    side="bottom"
    :overlay="!props.showCloseButton"
    :close="closeButtonProps"
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
        :class="['overflow-y-auto pb-2', props.bodyClass]"
      >
        <div ref="bodyContentElement">
          <slot name="body" />
        </div>
      </div>
      <div
        :class="[
          ...scrollIndicatorClasses,
          'top-0',
          'bg-gradient-to-b',
          { 'opacity-0': !isBodyContentOverflow || isBodyScrolledToTop },
        ]"
      />
      <div
        :class="[
          ...scrollIndicatorClasses,
          'bottom-0',
          'bg-gradient-to-t',
          { 'opacity-0': !isBodyContentOverflow || isBodyScrolledToBottom },
        ]"
      />
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  isDisabled?: boolean
  showCloseButton?: boolean
  bodyClass?: string
}>(), {
  showCloseButton: true,
  bodyClass: 'max-h-[40vh]',
})

const open = defineModel<boolean>('open')

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const bodyWrapperElement = useTemplateRef<HTMLDivElement>('bodyWrapperElement')
const bodyContentElement = useTemplateRef<HTMLDivElement>('bodyContentElement')
const { arrivedState: bodyWrapperElementArrivedState } = useScroll(bodyWrapperElement)
const {
  top: isBodyScrolledToTop,
  bottom: isBodyScrolledToBottom,
} = toRefs(bodyWrapperElementArrivedState)

const isBodyContentOverflow = ref(false)

function updateIsBodyContentOverflow() {
  const el = bodyWrapperElement.value
  if (!el) {
    isBodyContentOverflow.value = false
    return
  }
  isBodyContentOverflow.value = el.scrollHeight > el.clientHeight
}

useResizeObserver([bodyWrapperElement, bodyContentElement], updateIsBodyContentOverflow)

watch(bodyWrapperElement, async () => {
  await nextTick()
  updateIsBodyContentOverflow()
})

const scrollIndicatorClasses = [
  'absolute',

  'inset-x-0',

  'h-12',

  'from-white',
  'dark:from-black',
  'to-transparent',
  'pointer-events-none',
]

const closeButtonProps = computed(() => {
  if (!props.showCloseButton) {
    return false
  }

  return {
    color: 'neutral' as const,
    variant: 'soft' as const,
    class: 'rounded-full',
  }
})
</script>
