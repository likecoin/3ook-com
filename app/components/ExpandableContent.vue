<template>
  <div>
    <div
      ref="content"
      :style="containerStyle"
    >
      <slot />
    </div>

    <div
      v-if="shouldShowExpandToggle"
      class="relative"
    >
      <div
        v-if="!isExpanded"
        class="absolute bottom-full inset-x-0 h-[60px] bg-linear-to-t from-(--app-bg) to-(--app-bg)/0"
      />
      <UButton
        class="relative"
        :label="toggleButtonLabel"
        :trailing-icon="toggleButtonIcon"
        variant="link"
        :ui="{ base: 'px-0' }"
        @click="toggle"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  height: {
    type: Number,
    default: 300, // px
  },
})

const { t: $t } = useI18n()

const isExpanded = ref(false)
const shouldShowExpandToggle = ref(false)
const content = ref(null)
const contentHeight = ref(0)

const updateHeight = () => {
  if (content.value) {
    contentHeight.value = content.value.scrollHeight
    shouldShowExpandToggle.value = contentHeight.value > props.height
  }
}

onMounted(updateHeight)
useResizeObserver(content, updateHeight)

const containerStyle = computed(() => {
  if (isExpanded.value || !shouldShowExpandToggle.value) {
    return {}
  }
  return {
    maxHeight: `${props.height}px`,
    overflow: 'hidden',
  }
})

const toggle = () => {
  isExpanded.value = !isExpanded.value
}
const toggleButtonLabel = computed(() => {
  return isExpanded.value ? $t('expandable_content_show_less_button_label') : $t('expandable_content_show_more_button_label')
})
const toggleButtonIcon = computed(() => {
  return isExpanded.value ? 'i-material-symbols-keyboard-arrow-up-rounded' : 'i-material-symbols-keyboard-arrow-down-rounded'
})
</script>
