<template>
  <div class="w-full h-full flex flex-col justify-center bg-[#131313] border-[#50E3ce] border-b-[24px]">
    <header
      :class="[
        'flex',
        'flex-col',
        hasText ? 'justify-end' : 'justify-center items-center',
        'px-[64px]',
        'py-[48px]',
        'shrink-none',
      ]"
    >
      <AppLogo
        class="w-[624]"
        :height="96"
        :is-icon="false"
        :is-padded="false"
      />
    </header>

    <main
      v-if="hasText"
      class="flex flex-col justify-end grow px-[64px] py-[48px] bg-[#f7f7f7] text-[#131313]"
    >
      <h1
        v-if="!!title"
        class="my-0 text-[64px] leading-[96px] font-bold"
        v-text="title"
      />
      <p
        v-if="!!description"
        class="mt-[24px] mb-0 text-[32px]"
        v-text="description"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: '',
  description: '',
})

const hasText = computed(() => !!props.title || !!props.description)

const description = computed(() => trimText(props.description, 66))
</script>
