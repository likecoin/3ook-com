<template>
  <ul class="grid grid-cols-3 gap-x-2 gap-y-6">
    <li
      v-for="sample in samples"
      :key="sample.id"
      class="flex justify-center"
    >
      <button
        type="button"
        :class="[
          'group',
          'flex flex-col items-center gap-2',
          'w-full max-w-[140px] p-1',
          'text-center',
          'cursor-pointer',
          'rounded-lg',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-cyan',
        ]"
        @click="handleSampleClick(sample)"
      >
        <div class="relative transition-transform duration-200 group-hover:-translate-y-0.5">
          <img
            :class="[
              'w-16 h-16 tablet:w-20 tablet:h-20',
              'rounded-full',
              'object-cover',
              'ring-1 ring-(--ui-border)',
              'group-hover:shadow-lg transition-shadow duration-200',
            ]"
            :src="sample.avatarSrc"
            :alt="sample.title"
          >

          <span
            :class="[
              'absolute -bottom-0.5 -right-0.5',
              'flex items-center justify-center',
              'w-6 h-6 tablet:w-8 tablet:h-8',
              'bg-theme-black',
              'text-theme-cyan',
              'rounded-full',
              'shadow-md ring-2 ring-(--ui-bg)',
            ]"
          >
            <UIcon
              class="size-4 tablet:size-[18px]"
              :name="getOverlayIcon(sample.id)"
            />
          </span>

          <UBadge
            v-if="sample.isAffiliateExclusive"
            :class="[
              'absolute top-0 left-1/2',
              '-translate-x-1/2 -translate-y-1/2',
              'pointer-events-none whitespace-nowrap',
            ]"
            size="sm"
            color="warning"
            variant="solid"
            :ui="{ base: 'gap-0 rounded-full font-bold' }"
          >
            <span v-text="sample.affiliateExclusiveBadgeText || $t('tts_samples_section_affiliate_exclusive_badge')" />
            <span aria-hidden="true">*</span>
          </UBadge>
        </div>

        <div class="flex flex-col items-center gap-0.5 mt-1 w-full">
          <span
            :class="[
              'max-w-full',
              'text-sm font-medium truncate',
              'text-toned group-hover:text-highlighted transition-colors duration-200',
            ]"
            v-text="sample.title"
          />
          <span
            v-if="sample.description"
            class="text-xs text-muted truncate max-w-full"
            v-text="sample.description"
          />
        </div>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  samples: TTSSample[]
  playingSampleId?: string | null
}>(), {
  playingSampleId: null,
})

const emit = defineEmits<{
  sampleClick: [sample: { id: string, languageVoice: string }]
}>()

function getOverlayIcon(sampleId: string) {
  return props.playingSampleId === sampleId
    ? 'i-material-symbols-stop-rounded'
    : 'i-material-symbols-play-arrow-rounded'
}

function handleSampleClick(sample: { id: string, languageVoice: string }) {
  emit('sampleClick', sample)
}
</script>
