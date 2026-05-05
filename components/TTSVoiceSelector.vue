<template>
  <ul class="flex flex-col gap-3.5 w-full flex-wrap">
    <li
      v-for="sample in samples"
      :key="sample.id"
    >
      <UButton
        :class="[
          'relative',
          'w-full',
          'justify-start',
          'p-4',
          'group',
          'text-left',
          selectedVoiceId === sample.id
            ? 'ring-theme-cyan'
            : sample.isAffiliateExclusive ? 'ring-warning' : undefined,
          'rounded-lg',
          'cursor-pointer',
        ]"
        variant="outline"
        size="md"
        :ui="{ base: 'gap-3 bg-default hover:border-accented hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-in-out' }"
        @click="handleVoiceClick(sample)"
      >
        <template #leading>
          <div
            :class="[
              'flex',
              'items-center',
              'justify-center',
              'w-10',
              'h-10',
              'rounded-full',
              'bg-accented',
              'group-hover:bg-muted',
              'transition-colors',
              'duration-200',
              'flex-shrink-0',
            ]"
          >
            <UIcon
              :name="icon"
              class="text-muted group-hover:text-highlighted transition-colors duration-200"
              size="20"
            />
          </div>
        </template>

        <div class="flex flex-col gap-1 grow">
          <div
            class="font-medium text-toned truncate group-hover:text-highlighted transition-colors duration-200"
            v-text="sample.title"
          />
          <div
            v-if="sample.description"
            class="text-sm text-muted truncate transition-colors duration-200"
            v-text="sample.description"
          />
        </div>

        <UBadge
          v-if="sample.isAffiliateExclusive"
          class="absolute top-0 right-3 -translate-y-1/2 pointer-events-none"
          size="sm"
          color="warning"
          variant="solid"
          :ui="{ base: 'gap-0 rounded-full font-bold' }"
        >
          <span v-text="$t('tts_samples_section_affiliate_exclusive_badge')" />
          <span aria-hidden="true">*</span>
        </UBadge>

        <template #trailing>
          <img
            class="w-12 h-12 rounded-full ring-theme-black"
            :src="sample.avatarSrc"
            :alt="sample.description"
          >
        </template>
      </UButton>
    </li>
  </ul>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  selectedVoiceId?: string | null
  samples: TTSSample[]
}>(), {
  icon: 'i-material-symbols-play-arrow-rounded',
  selectedVoiceId: undefined,
})

const emit = defineEmits<{
  voiceClick: [sample: { id: string, languageVoice: string }]
}>()

function handleVoiceClick(sample: { id: string, languageVoice: string }) {
  emit('voiceClick', sample)
}
</script>
