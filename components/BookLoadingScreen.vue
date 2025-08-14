<template>
  <div class="flex flex-col justify-center items-center py-[56px]">
    <BookCover
      class="relative max-w-[164px] w-full max-h-[25vh] mt-[8vh] shrink-0"
      :src="props.bookCoverSrc"
      :alt="props.bookName"
      :has-shadow="true"
    />
    <span
      :class="[
        'h-[1em]',
        'mt-4',
        'text-[40px]',
      ]"
    >
      <UIcon
        v-if="props.icon"
        :name="icon"
      />
    </span>
    <span
      class="min-h-9 mt-1 text-xl font-bold leading-9 text-center"
      v-text="iconLabel"
    />

    <span
      class="text-sm laptop:text-base text-[#949494] font-semibold text-center"
      v-text="props.bookName"
    />

    <footer class="flex flex-col items-center w-full min-h-10 mt-[56px] px-4 text-center">
      <slot
        v-if="$slots.footer"
        class="mt-[56px]"
        name="footer"
      />
      <template v-else>
        <span
          class="text-gray-600 text-[10px]"
          v-text="loadingLabel"
        />
        <UProgress
          class="mt-2 max-w-[160px]"
          size="sm"
          :value="props.loadingProgress"
        />
      </template>
    </footer>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  bookCoverSrc: {
    type: String,
    default: '',
  },
  bookName: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: undefined,
  },
  iconLabel: {
    type: String,
    default: '',
  },
  loadingLabel: {
    type: String,
    default: 'Loading...',
  },
  loadingProgress: {
    type: Number,
    default: null,
  },
})
</script>
