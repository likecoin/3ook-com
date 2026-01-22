<template>
  <button
    :class="[
      buttonClass,
      'relative',
      'h-[60px]',
      'bg-linear-to-b',
      'from-[#C0E5E0]',
      'to-[#F4F9FA]',
      'rounded-lg',
      'border',
      'border-green-500/20',
      'group',
      'cursor-pointer',
      'shadow-[0px_10px_20px_0px_rgba(0,0,0,0.04)]',
    ]"
    @click="emit('click')"
  >
    <div
      :class="[
        'absolute',
        'inset-0',
        'bg-gray-300',
        'opacity-0 group-hover:opacity-20',
        'transition-opacity',
        'rounded-[inherit]',
        'pointer-events-none',
      ]"
    />

    <div
      :class="[
        buttonClass,
        'absolute',
        'inset-0',
        'rounded-[inherit]',
        'overflow-hidden',
        'pointer-events-none',
      ]"
      :aria-hidden="true"
    >
      <div class="flex items-center justify-center">
        <div :class="[diskClass, 'group-hover:scale-105', 'bg-white/20', 'w-[202px]', 'h-[202px]']" />
        <div :class="[diskClass, 'group-hover:scale-110', 'bg-white/30', 'w-[144px]', 'h-[144px]']" />
        <div :class="[diskClass, 'group-hover:scale-120', 'bg-white/50', 'w-[90px]', 'h-[90px]']" />
      </div>
      <span
        :class="[labelClass, 'opacity-0']"
        v-text="props.label"
      />
    </div>

    <img
      :class="[
        'relative',
        'h-[inherit]',
        '-translate-y-1.5',
        'group-hover:scale-110',
        'ease-in-out',
        'transition-transform',
      ]"
      :src="bookImage"
    >

    <span
      :class="[labelClass, 'relative', 'text-theme-cyan']"
      v-text="props.label"
    />
  </button>
</template>

<script lang="ts" setup>
import bookImage from '~/assets/images/gift-book.png'

const props = defineProps<{
  label?: string
}>()

const emit = defineEmits(['click'])

const buttonClass = [
  'flex',
  'items-center',
  'justify-center',
  'gap-[32px] tablet:gap-[44px]',
]

const diskClass = [
  'absolute',
  'rounded-full',
  'shadow-xs',
  'transition-transform',
]

const labelClass = [
  'text-xl',
  'font-bold',
]
</script>
