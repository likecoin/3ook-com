<template>
  <ul
    :class="[...gridClasses, 'w-full']"
    aria-hidden="true"
  >
    <!-- Mirrors BookstoreItem's element structure, not just its look, so the
         swap to real items doesn't shift the rows below. -->
    <li
      v-for="index in SKELETON_COUNT"
      :key="index"
      :class="['flex flex-col justify-end text-sm', getGridItemClassesByIndex(index - 1)]"
    >
      <USkeleton class="w-full aspect-2/3 rounded-lg" />

      <div class="mt-2 min-h-[3.2lh]">
        <!-- Sized to stay under the 3.2lh min above, so that min governs the
             block's height and the swap to real items doesn't shift the grid. -->
        <div class="flex flex-col gap-1.5">
          <USkeleton class="h-3.5 rounded" />
          <USkeleton class="h-3.5 w-3/5 rounded" />
        </div>

        <div class="h-lh mt-[0.5lh]">
          <USkeleton class="h-2.5 w-2/5 rounded" />
        </div>
      </div>

      <div class="flex items-center h-lh mt-[0.5lh]">
        <USkeleton class="h-[0.8lh] w-1/3 rounded" />
      </div>

      <!-- Empty like BookstoreItem's rank row, which reserves its line either way. -->
      <div class="text-xs h-lh" />
    </li>
  </ul>
</template>

<script setup lang="ts">
// Two full rows at the widest breakpoint; maxRows below trims it back to two
// rows at every narrower one, so the placeholder never runs off the fold.
const SKELETON_COUNT = GRID_COLUMN_MAX * 2

const { gridClasses, getGridItemClassesByIndex } = usePaginatedGrid({
  itemsCount: SKELETON_COUNT,
  hasMore: false,
  maxRows: 2,
})
</script>
