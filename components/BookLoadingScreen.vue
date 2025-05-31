<template>
  <div class="flex flex-col justify-center items-center py-[56px]">
    <NuxtLink :to="$localeRoute({ name: 'shelf' })">
      <AppLogo
        class="text-green-500 shrink-0"
        :height="24"
      />
    </NuxtLink>

    <BookCover
      class="relative max-w-[164px] max-h-[30vh] mt-[8vh] shrink-0 box-[0,2px,4px,0_rgba(0,0,0,.10)]"
      :src="props.bookCoverSrc"
      :alt="props.bookName"
    />
    <img
      class="w-full max-w-[432px] h-[78px] -mt-[10px] object-cover pointer-events-none"
      src="~/assets/images/bookshelf.png"
    >

    <span
      :class="[
        'h-[1em]',
        'mt-4',
        'text-green-500',
        'text-[40px]',
      ]"
    >
      <UIcon
        v-if="props.icon"
        :name="icon"
      />
    </span>
    <span
      class="min-h-9 mt-1 text-green-500 text-xl font-bold leading-9"
      v-text="iconLabel"
    />

    <span
      class="text-sm laptop:text-base text-[#949494] font-semibold"
      v-text="props.bookName"
    />

    <footer class="flex flex-col items-center w-full min-h-10 mt-[56px]">
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
