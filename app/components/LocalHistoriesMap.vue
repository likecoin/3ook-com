<template>
  <div class="w-full overflow-hidden rounded-xl">
    <svg
      ref="svgRef"
      class="lh-map h-full w-full"
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="ariaLabel"
      role="img"
      @click="handleClick"
    >
      <g
        id="features"
        :style="{ transform: mapTransform }"
      >
        <slot name="paths" />
      </g>
      <g
        v-if="$slots.pins"
        id="pins"
        :style="{ transform: mapTransform }"
      >
        <slot name="pins" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedKey?: string | null
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'key-click', key: string): void
}>()

const IDENTITY_TRANSFORM = 'translate(0px, 0px) scale(1)'

const svgRef = ref<SVGSVGElement | null>(null)
const mapTransform = ref(IDENTITY_TRANSFORM)

const handleClick = (event: MouseEvent) => {
  const target = event.target as Element | null
  const key = target?.getAttribute?.('data-key')
  if (!key) return
  emit('key-click', key)
}

const updateTransform = (key?: string | null) => {
  const svg = svgRef.value
  if (!key || !svg) {
    mapTransform.value = IDENTITY_TRANSFORM
    return
  }

  const nodes = svg.querySelectorAll<SVGGraphicsElement>(`#features [data-key="${key}"]`)
  if (!nodes.length) {
    mapTransform.value = IDENTITY_TRANSFORM
    return
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  nodes.forEach((node) => {
    const { x, y, width, height } = node.getBBox()
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  })

  const width = Math.max(maxX - minX, 1)
  const height = Math.max(maxY - minY, 1)
  const padding = Math.max(width, height) * 0.22
  const paddedWidth = width + padding * 2
  const paddedHeight = height + padding * 2
  const minExtent = 260
  const finalWidth = Math.max(paddedWidth, minExtent)
  const finalHeight = Math.max(paddedHeight, minExtent)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const scale = Math.min(3.2, 1000 / Math.max(finalWidth, finalHeight))
  const translateX = 500 - centerX * scale
  const translateY = 500 - centerY * scale

  mapTransform.value = `translate(${translateX}px, ${translateY}px) scale(${scale})`
}

// Slot geometry is opaque to scoped CSS, so selection dim/highlight
// is applied as data attributes instead of enumerated CSS selectors.
const updateSelectionStyles = (key?: string | null) => {
  const svg = svgRef.value
  if (!svg) return

  svg.querySelectorAll<SVGGraphicsElement>('#features [data-key]').forEach((node) => {
    const isSelected = !!key && node.getAttribute('data-key') === key
    node.setAttribute('data-highlighted', String(isSelected))
    node.setAttribute('data-dimmed', String(!!key && !isSelected))
  })
}

const applySelection = async (key?: string | null) => {
  await nextTick()
  updateTransform(key)
  updateSelectionStyles(key)
}

// The initial selection is applied in onMounted: an immediate watch would
// fire during setup, before hydration assigns svgRef, and silently no-op.
watch(
  () => props.selectedKey,
  (key) => {
    applySelection(key)
  },
  { flush: 'post' },
)

onMounted(() => {
  applySelection(props.selectedKey)
})
</script>

<style scoped>
.lh-map :deep(path) {
  fill: var(--map-fill, rgba(127, 178, 149, 0.442));
  stroke: var(--map-stroke, rgba(99, 142, 117, 0.442));
  stroke-width: 1;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.lh-map #features,
.lh-map #pins {
  transform-box: view-box;
  transform-origin: 0 0;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.lh-map #pins {
  pointer-events: none;
}

.lh-map :deep(#pins circle) {
  fill: var(--map-pin-fill, rgba(180, 80, 50, 0.7));
  stroke: white;
  stroke-width: 1.5;
}

.lh-map :deep(path:hover) {
  opacity: 0.85;
}

.lh-map :deep([data-key]) {
  cursor: pointer;
}

.lh-map :deep([data-key][data-dimmed='true']) {
  opacity: 0.35;
}

.lh-map :deep([data-key][data-highlighted='true']) {
  fill: var(--map-selected-fill, rgba(75, 120, 94, 0.442));
}

@media (prefers-reduced-motion: reduce) {
  .lh-map #features,
  .lh-map #pins {
    transition: none;
  }
}
</style>
