<template>
  <ol
    :class="LIBRARY_CHART_LIST_CLASS"
    aria-hidden="true"
  >
    <li
      v-for="(chart, index) in rows"
      :key="index"
      :class="[chart.grid, chart.height]"
    >
      <div
        :class="[
          'flex items-center w-full h-full',
          getLibraryChartSurfaceClass(chart.tier),
          chart.row,
        ]"
      >
        <span :class="['shrink-0 flex justify-center', chart.rank]">
          <USkeleton class="bg-skeleton w-1/2 h-[0.8lh] rounded" />
        </span>

        <USkeleton
          :class="[
            'bg-skeleton',
            'shrink-0 aspect-2/3',
            chart.cover,
            chart.coverRounded,
          ]"
        />

        <span
          :class="[
            'min-w-0 grow flex flex-col gap-1.5 tablet:w-full',
            chart.title,
            { 'tablet:grow-0 tablet:items-center': chart.isPodium },
          ]"
        >
          <USkeleton class="bg-skeleton w-full h-[0.8lh] rounded" />
          <USkeleton class="bg-skeleton w-2/5 h-[0.7lh] rounded" />
        </span>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
// Built once rather than per binding:
// the tier alone was resolved six times a row from the template.
const rows = Array.from(
  { length: LIBRARY_CHART_SIZE },
  (_, index) => getLibraryChartItemClasses(index + 1),
)
</script>
