<template>
  <div
    ref="wrapperRef"
    class="relative"
  >
    <div class="flex items-center max-phone:gap-1 gap-2 w-full">
      <template v-if="isLoading">
        <USkeleton
          v-for="(widthClass, i) in SKELETON_WIDTHS"
          :key="`skeleton-${i + 1}`"
          :class="[
            'shrink-0',
            widthClass,
            'h-8 laptop:h-9',
            'rounded-full',
            'border-2',
            'border-muted',
          ]"
        />
        <USkeleton
          v-if="hasOverflow"
          class="shrink-0 w-9 h-8 laptop:h-9 rounded-full border-2 border-muted"
        />
      </template>
      <template v-else>
        <div class="flex items-center max-phone:gap-1 gap-2 overflow-hidden min-w-0">
          <PillButton
            v-for="item in visibleItems"
            :key="item.value"
            :label="item.label"
            :to="item.to"
            :is-active="item.value === modelValue"
            @click.prevent="handleVisibleClick(item)"
          />
        </div>
        <div
          v-if="hiddenItems.length"
          class="relative shrink-0 rounded-full"
        >
          <PillButton
            icon="i-material-symbols-keyboard-arrow-down-rounded"
            :aria-label="ariaLabel"
            is-static
          />
          <select
            v-model="selectValue"
            class="absolute inset-0 opacity-0 rounded-full cursor-pointer"
            :aria-label="ariaLabel"
            @change="handleSelectChange"
          >
            <option
              value=""
              disabled
            />
            <option
              v-for="item in hiddenItems"
              :key="item.value"
              :value="item.value"
              v-text="item.label"
            />
          </select>
        </div>
      </template>
    </div>

    <div
      v-if="!isLoading"
      ref="measureRef"
      class="absolute inset-x-0 top-0 flex flex-wrap items-center max-phone:gap-1 gap-2 invisible pointer-events-none"
      aria-hidden="true"
    >
      <PillButton
        v-for="item in measurementOrder"
        :key="`m-${item.value}`"
        :label="item.label"
        :is-active="item.value === modelValue"
      />
      <PillButton
        icon="i-material-symbols-keyboard-arrow-down-rounded"
        is-static
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

interface PillButtonItem {
  value: string
  label: string
  to?: RouteLocationRaw
}

const props = withDefaults(defineProps<{
  items: PillButtonItem[]
  modelValue: string
  ariaLabel?: string
  isLoading?: boolean
}>(), {
  isLoading: false,
})

const SKELETON_WIDTHS = ['w-20', 'w-18', 'w-24', 'w-16']

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'click': [item: PillButtonItem]
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)
const selectValue = ref('')

const visibleValues = ref<string[]>([])
const hiddenValues = ref<string[]>([])
const measurementValues = ref<string[]>(props.items.map(i => i.value))
const hasOverflow = ref(false)
let isUnmounted = false

const itemsByValue = computed(() => new Map(props.items.map(i => [i.value, i])))

function resolveValues(values: string[]): PillButtonItem[] {
  const map = itemsByValue.value
  const result: PillButtonItem[] = []
  for (const v of values) {
    const item = map.get(v)
    if (item) result.push(item)
  }
  return result
}

const visibleItems = computed(() => resolveValues(visibleValues.value))
const hiddenItems = computed(() => resolveValues(hiddenValues.value))
const measurementOrder = computed(() => resolveValues(measurementValues.value))

const itemsFingerprint = computed(() =>
  JSON.stringify(props.items.map(i => [i.value, i.label])),
)

function measureLayout() {
  if (!measureRef.value) return null
  const children = Array.from(measureRef.value.children) as HTMLElement[]
  if (children.length < 2) return null
  const itemEls = children.slice(0, -1)
  const selectEl = children.at(-1)!
  const firstTop = itemEls[0]!.offsetTop
  let itemsInRow1 = 0
  for (const el of itemEls) {
    if (el.offsetTop === firstTop) {
      itemsInRow1 += 1
    }
    else {
      break
    }
  }
  return {
    itemsInRow1,
    selectInRow1: selectEl.offsetTop === firstTop,
    totalItems: itemEls.length,
  }
}

let recomputeId = 0

async function recompute() {
  const id = ++recomputeId
  const isStale = () => id !== recomputeId || isUnmounted

  if (props.items.length === 0) {
    visibleValues.value = []
    hiddenValues.value = []
    measurementValues.value = []
    hasOverflow.value = false
    return
  }

  const initialValues = props.items.map(i => i.value)
  measurementValues.value = initialValues
  await nextTick()
  if (isStale()) return

  let measurement = measureLayout()
  if (!measurement) {
    visibleValues.value = initialValues
    hiddenValues.value = []
    return
  }

  const order = [...initialValues]
  if (measurement.itemsInRow1 === measurement.totalItems) {
    visibleValues.value = order
    hiddenValues.value = []
    hasOverflow.value = false
    return
  }

  let visibleCount = measurement.selectInRow1
    ? measurement.itemsInRow1
    : Math.max(0, measurement.itemsInRow1 - 1)

  let activeIdx = order.indexOf(props.modelValue)
  let iterations = 0
  while (activeIdx >= 0 && activeIdx >= visibleCount && visibleCount > 0 && iterations < 5) {
    const lastVisibleIdx = visibleCount - 1
    if (activeIdx === lastVisibleIdx) break

    const tmp = order[lastVisibleIdx]!
    order[lastVisibleIdx] = order[activeIdx]!
    order[activeIdx] = tmp

    measurementValues.value = [...order]
    await nextTick()
    if (isStale()) return

    measurement = measureLayout()
    if (!measurement) break

    if (measurement.itemsInRow1 === measurement.totalItems) {
      visibleCount = measurement.totalItems
      break
    }

    const newVisibleCount = measurement.selectInRow1
      ? measurement.itemsInRow1
      : Math.max(0, measurement.itemsInRow1 - 1)
    if (newVisibleCount === visibleCount) break

    visibleCount = newVisibleCount
    activeIdx = order.indexOf(props.modelValue)
    iterations += 1
  }

  if (isStale()) return
  visibleValues.value = order.slice(0, visibleCount)
  hiddenValues.value = order.slice(visibleCount)
  hasOverflow.value = visibleCount < order.length
}

onMounted(async () => {
  await nextTick()
  await recompute()
})

onUnmounted(() => {
  isUnmounted = true
})

useResizeObserver(wrapperRef, () => {
  recompute()
})

watch(
  () => [props.isLoading, itemsFingerprint.value, props.modelValue],
  () => recompute(),
)

function handleVisibleClick(item: PillButtonItem) {
  if (item.value !== props.modelValue) {
    emit('update:modelValue', item.value)
  }
  emit('click', item)
}

function handleSelectChange() {
  const chosen = selectValue.value
  selectValue.value = ''
  if (!chosen) return

  const item = itemsByValue.value.get(chosen)
  if (!item) return

  if (item.value !== props.modelValue) {
    emit('update:modelValue', item.value)
  }
  emit('click', item)
}
</script>
