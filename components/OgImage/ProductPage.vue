<template>
  <div class="w-full h-full flex flex-col bg-[#f7f7f7] text-[#131313] border-[#50E3ce] border-b-[24px]">
    <AppLogo
      class="absolute top-[48px] right-[48px]"
      :width="64"
      :height="64"
    />

    <main class="flex flex-row grow items-end gap-[48px] px-[64px] py-[48px]">
      <img
        v-if="bookCoverSrc"
        class="max-w-[180px] max-h-[270px]"
        :src="bookCoverSrc"
      >

      <div class="flex flex-col justify-end flex-1">
        <h1
          class="my-0 pr-[72px] text-[64px] font-bold leading-[72px]"
          v-text="bookName"
        />

        <p
          v-if="!!bookAuthor"
          class="text-[32px] mt-[16px] mb-0 text-[#9b9b9b] leading-[32px] text-ellipsis"
          v-text="bookAuthor"
        />
      </div>
    </main>

    <footer class="flex flex-row justify-between items-center shrink-0 px-[64px] py-[48px] border-[currentColor] border-t-[4px] text-[#131313]">
      <p
        class="my-0 text-[32px]"
        v-text="bookDescription"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  bookName?: string
  bookDescription?: string
  bookAuthor?: string
  bookCoverSrc?: string
}>(), {
  bookName: '',
  bookDescription: '',
  bookAuthor: '',
  bookCoverSrc: undefined,
})

const bookDescription = computed(() => trimText(props.bookDescription, 66))
</script>
