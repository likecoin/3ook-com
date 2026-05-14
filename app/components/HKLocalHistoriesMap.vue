<template>
  <div class="w-full overflow-hidden rounded-xl">
    <svg
      ref="svgRef"
      class="hk-map h-full w-full"
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      :aria-label="ariaLabel"
      role="img"
      :data-active-area="activeArea ?? ''"
      :data-selected-area="selectedArea ?? ''"
      @mousemove="handleMove"
      @mouseleave="handleLeave"
      @click="handleClick"
    >
      <g
        id="features"
        :style="{ transform: mapTransform }"
      >
        <HKMapPaths />
      </g>
      <g
        id="pins"
        :style="{ transform: mapTransform }"
      >
        <HKMapPins />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  activeArea?: string | null
  selectedArea?: string | null
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'area-hover', area: string | null): void
  (e: 'area-click', area: string): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const mapTransform = ref('translate(0px, 0px) scale(1)')

let lastHoveredArea: string | null = null

const handleMove = (event: MouseEvent) => {
  const target = event.target as Element | null
  const area = target?.getAttribute?.('data-area') || null
  if (area === lastHoveredArea) return
  lastHoveredArea = area
  emit('area-hover', area)
}

const handleLeave = () => {
  if (lastHoveredArea === null) return
  lastHoveredArea = null
  emit('area-hover', null)
}

const handleClick = (event: MouseEvent) => {
  const target = event.target as Element | null
  const area = target?.getAttribute?.('data-area')
  if (!area) return
  emit('area-click', area)
}

const updateTransform = async (area?: string | null) => {
  if (!area) {
    mapTransform.value = 'translate(0px, 0px) scale(1)'
    return
  }

  await nextTick()
  const svg = svgRef.value
  if (!svg) {
    mapTransform.value = 'translate(0px, 0px) scale(1)'
    return
  }

  const nodes = svg.querySelectorAll<SVGGraphicsElement>(`#features [data-area="${area}"]`)
  if (!nodes.length) {
    mapTransform.value = 'translate(0px, 0px) scale(1)'
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

watch(
  () => props.selectedArea,
  (area) => {
    updateTransform(area)
  },
  { immediate: true, flush: 'post' },
)
</script>

<style scoped>
.hk-map :deep(path) {
  fill: rgba(210, 140, 90, 0.45);
  stroke: rgba(180, 110, 70, 0.45);
  stroke-width: 1;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
}

.hk-map #features {
  transform-box: view-box;
  transform-origin: 0 0;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.hk-map #pins {
  transform-box: view-box;
  transform-origin: 0 0;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
  pointer-events: none;
}

.hk-map :deep(#pins circle) {
  fill: rgba(180, 80, 50, 0.7);
  stroke: white;
  stroke-width: 1.5;
}

.hk-map :deep(path:hover) {
  opacity: 0.85;
}

.hk-map :deep([data-area]) {
  cursor: pointer;
}

.hk-map[data-selected-area='hk-island'] :deep([data-area]:not([data-area='hk-island'])),
.hk-map[data-selected-area='kowloon'] :deep([data-area]:not([data-area='kowloon'])),
.hk-map[data-selected-area='new-territories'] :deep([data-area]:not([data-area='new-territories'])),
.hk-map[data-selected-area='islands'] :deep([data-area]:not([data-area='islands'])) {
  opacity: 0.35;
}

.hk-map[data-selected-area='hk-island'] :deep([data-area='hk-island']),
.hk-map[data-selected-area='kowloon'] :deep([data-area='kowloon']),
.hk-map[data-selected-area='new-territories'] :deep([data-area='new-territories']),
.hk-map[data-selected-area='islands'] :deep([data-area='islands']) {
  fill: rgba(180, 100, 60, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  .hk-map #features,
  .hk-map #pins {
    transition: none;
  }
}
</style>
