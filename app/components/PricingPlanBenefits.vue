<template>
  <div
    :class="[
      'flex',
      'flex-col',
      isTitleCenter ? 'items-center' : 'items-start',
      'gap-3 laptop:gap-4',
      'w-full',
    ]"
  >
    <URadioGroup
      v-if="isTierSelectorVisible"
      v-model="selectedTier"
      :items="tierOptions"
      orientation="horizontal"
      variant="table"
      indicator="hidden"
      :ui="{
        root: 'w-full mb-2',
        fieldset: 'w-full',
        item: tierItemClass,
        label: tierLabelClass,
      }"
    />
    <div
      v-else-if="!isTitleHidden"
      :class="[
        isDarkBackground ? 'text-theme-cyan' : 'text-theme-black dark:text-theme-cyan',
        isTitleCenter ? 'text-center' : 'text-left',
        'font-bold',
        'border-b-2 border-current',
      ]"
      v-text="title || $t('pricing_page_subscription')"
    />

    <ul :class="featureListClass">
      <li
        v-for="(feature, index) in prependedFeatures"
        :key="`prepended-${index}`"
      >
        <UIcon name="i-material-symbols-check" />
        <span v-text="feature" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <i18n-t
          keypath="pricing_page_feature_library"
          tag="span"
        >
          <template #library>
            <NuxtLink
              :to="localeRoute({ name: 'library' })"
              class="underline"
              @click="handleClickLibrary"
            >
              {{ $t('pricing_page_feature_library_link') }}
            </NuxtLink>
          </template>
        </i18n-t>
      </li>
      <li v-if="!isAudioHidden">
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_1')" />
      </li>
      <li>
        <UIcon name="i-material-symbols-check" />
        <span v-text="$t('pricing_page_feature_2')" />
      </li>
    </ul>

    <div
      v-if="isTierSelectorVisible && selectedTier !== 'civic'"
      :class="dividerClass"
    >
      <span class="h-px flex-1 bg-current" />
      <UButton
        color="neutral"
        variant="link"
        size="xs"
        trailing-icon="i-material-symbols-expand-circle-down-outline-rounded"
        :label="$t('pricing_page_civic_upgrade_cta')"
        class="font-semibold"
        :class="isDarkBackground
          ? 'text-white/80 hover:text-theme-cyan'
          : 'dark:hover:text-theme-cyan'"
        @click="handleUpgradeToCivic"
      />
      <span class="h-px flex-1 bg-current" />
    </div>

    <div
      v-if="selectedTier === 'civic'"
      :class="dividerClass"
    >
      <span class="h-px flex-1 bg-current" />
      <span
        class="px-2 font-semibold"
        :class="isDarkBackground
          ? 'text-theme-cyan'
          : 'text-highlighted dark:text-theme-cyan'"
        v-text="$t('pricing_page_civic_extra_divider')"
      />
      <span class="h-px flex-1 bg-current" />
    </div>

    <UCollapsible
      :open="selectedTier === 'civic'"
      :class="{ '-mb-3 laptop:-mb-4': selectedTier !== 'civic' }"
    >
      <template #content>
        <ul :class="featureListClass">
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('pricing_page_civic_benefit_gift')" />
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <i18n-t
              keypath="pricing_page_civic_benefit_voices"
              tag="span"
            >
              <template #voiceArtist>
                <button
                  type="button"
                  class="underline cursor-pointer"
                  @click="handleShowVoices"
                  v-text="$t('pricing_page_civic_benefit_voices_artist')"
                />
              </template>
            </i18n-t>
          </li>
          <li>
            <UIcon name="i-material-symbols-check" />
            <span v-text="$t('pricing_page_civic_benefit_request')" />
          </li>
        </ul>
      </template>
    </UCollapsible>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  title?: string
  isTitleCenter?: boolean
  isTitleHidden?: boolean
  isDarkBackground?: boolean
  isAudioHidden?: boolean
  prependedFeatures?: string[]
  // Shows a tier selector in place of the title and, on Civic, appends the
  // Civic-only benefits below the shared Plus list.
  isTierSelectorVisible?: boolean
  // The viewer's active tier, marked as "current plan" in the toggle.
  currentTier?: LikerPlusTier
}>(), {
  isTitleCenter: false,
  isTitleHidden: false,
  isDarkBackground: false,
  isAudioHidden: false,
  prependedFeatures: () => [],
  isTierSelectorVisible: false,
  currentTier: undefined,
})

const emit = defineEmits<{ showVoices: [] }>()

const selectedTier = defineModel<LikerPlusTier>('tier', { default: 'plus' })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const tierOptions = computed<{
  value: LikerPlusTier
  label: string
  isCurrent: boolean
  class: string[]
}[]>(() => [
  {
    value: 'plus',
    label: $t('pricing_page_tier_plus'),
    isCurrent: props.currentTier === 'plus',
    class: props.isDarkBackground
      ? [
          'bg-theme-cyan/5',
          'has-data-[state=checked]:bg-theme-cyan/10',
        ]
      : [
          'bg-theme-cyan/10 dark:bg-theme-cyan/5',
          'has-data-[state=checked]:bg-theme-black/90',
          'dark:has-data-[state=checked]:bg-theme-cyan/10',
        ],
  },
  {
    value: 'civic',
    label: $t('pricing_page_tier_civic'),
    isCurrent: props.currentTier === 'civic',
    class: props.isDarkBackground
      ? [
          'bg-theme-cyan/20',
          'has-data-[state=checked]:bg-theme-cyan/30',
        ]
      : [
          'bg-theme-cyan/30 dark:bg-theme-cyan/20',
          'has-data-[state=checked]:bg-theme-black/90',
          'dark:has-data-[state=checked]:bg-theme-cyan/30',
        ],
  },
])

const tierItemClass = computed(() => [
  'flex-1',
  'py-2',
  'cursor-pointer',
  'transition-colors',
  'duration-200',
  'border-0',
  'ring-2',
  'ring-inset',
  ...(props.isDarkBackground
    ? [
        'text-theme-cyan',
        'ring-theme-cyan/20',
        'has-data-[state=checked]:ring-theme-cyan',
      ]
    : [
        'text-theme-black',
        'has-data-[state=checked]:text-theme-cyan',
        'ring-theme-black/20 dark:ring-theme-cyan/20',
        'has-data-[state=checked]:ring-theme-black',
        'dark:has-data-[state=checked]:ring-theme-cyan',
      ]),
])

const tierLabelClass = computed(() => [
  'text-xl',
  'font-bold',
  'cursor-pointer',
  props.isDarkBackground ? 'text-theme-cyan' : 'text-inherit dark:text-theme-cyan',
])

const featureListClass = computed(() => [
  '*:flex *:items-start',
  'space-y-3 laptop:space-y-4',
  'text-left',
  'whitespace-pre-wrap',
  '[&>li>span:first-child]:shrink-0',
  '[&>li>span:first-child]:mt-1',
  '[&>li>span:first-child]:mr-2',
  '[&>li>span:first-child]:text-theme-cyan',
  { '[&>li>span:last-child]:text-white': props.isDarkBackground },
])

// Tier dividers
const dividerClass = computed(() => [
  'flex items-center gap-3 w-full text-xs min-h-6',
  props.isDarkBackground ? 'text-white/60' : 'text-muted',
])

function handleClickLibrary() {
  useLogEvent('pricing_benefit_click_library')
}

function handleShowVoices() {
  useLogEvent('pricing_benefit_click_civic_voices')
  emit('showVoices')
}

function handleUpgradeToCivic() {
  useLogEvent('pricing_page_civic_upgrade_cta_click')
  selectedTier.value = 'civic'
}
</script>
