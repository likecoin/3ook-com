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
    <div
      v-if="isTierSelectorVisible"
      class="flex items-center gap-3 w-full"
    >
      <div
        v-if="!isTitleHidden"
        :class="titleClass"
        v-text="benefitsTitle"
      />
      <div
        class="inline-flex shrink-0 ml-auto p-0.5 rounded-full"
        :class="tierToggleClass.track"
        role="radiogroup"
        :aria-label="$t('pricing_page_tier_selector_label')"
      >
        <button
          v-for="(option, index) in tierOptions"
          :key="option.value"
          ref="tierButtons"
          type="button"
          role="radio"
          :aria-checked="option.value === selectedTier"
          :tabindex="option.value === selectedTier ? 0 : -1"
          :aria-label="option.value === currentTier
            ? `${option.label} (${$t('pricing_page_current_plan')})`
            : undefined"
          :class="[
            'px-4 py-1',
            'text-xs font-semibold',
            'rounded-full',
            'transition-all duration-200',
            'cursor-pointer',
            option.value === selectedTier ? tierToggleClass.active : tierToggleClass.inactive,
          ]"
          @click="handleSelectTier(option.value)"
          @keydown.exact="handleTierKeydown($event, index)"
          v-text="option.label"
        />
      </div>
    </div>
    <div
      v-else-if="!isTitleHidden"
      :class="titleClass"
      v-text="benefitsTitle"
    />

    <ul :class="featureListClass">
      <li
        v-for="(feature, index) in prependedFeatures"
        :key="`prepended-${index}`"
      >
        <UIcon name="i-material-symbols-check" />
        <span v-text="feature" />
      </li>
      <template v-if="isBenefitsCopyVariant('variant-a')">
        <li>
          <UIcon name="i-material-symbols-check" />
          <i18n-t
            keypath="pricing_page_feature_variant_a_library"
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
          <i18n-t
            keypath="pricing_page_feature_variant_a_voice"
            tag="span"
          >
            <template #voiceActor>
              <button
                v-if="isVoiceSampleEnabled"
                type="button"
                class="underline cursor-pointer"
                @click="handleShowVoiceSample"
                v-text="$t('pricing_page_feature_1_voice_actor')"
              />
              <span
                v-else
                v-text="$t('pricing_page_feature_1_voice_actor')"
              />
            </template>
          </i18n-t>
        </li>
        <li v-if="!isAudioHidden">
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_variant_a_preset_voices')" />
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_2')" />
        </li>
      </template>
      <template v-else-if="isBenefitsCopyVariant('variant-b')">
        <li>
          <UIcon name="i-material-symbols-check" />
          <!-- featureListClass's dark-bg text rule only targets span children,
            so the div binds text-white itself. -->
          <div :class="{ 'text-white': isDarkBackground }">
            <p
              class="font-bold"
              v-text="$t('pricing_page_feature_variant_b_1_title')"
            />
            <i18n-t
              keypath="pricing_page_feature_variant_b_1_desc"
              tag="p"
              class="mt-1 text-sm opacity-80"
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
          </div>
        </li>
        <li v-if="!isAudioHidden">
          <UIcon name="i-material-symbols-check" />
          <div :class="{ 'text-white': isDarkBackground }">
            <p
              class="font-bold"
              v-text="$t('pricing_page_feature_variant_b_2_title')"
            />
            <i18n-t
              keypath="pricing_page_feature_variant_b_2_desc"
              tag="p"
              class="mt-1 text-sm opacity-80"
            >
              <template #voiceActor>
                <button
                  v-if="isVoiceSampleEnabled"
                  type="button"
                  class="underline cursor-pointer"
                  @click="handleShowVoiceSample"
                  v-text="$t('pricing_page_feature_1_voice_actor')"
                />
                <span
                  v-else
                  v-text="$t('pricing_page_feature_1_voice_actor')"
                />
              </template>
            </i18n-t>
          </div>
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <div :class="{ 'text-white': isDarkBackground }">
            <p
              class="font-bold"
              v-text="$t('pricing_page_feature_variant_b_3_title')"
            />
            <p
              class="mt-1 text-sm opacity-80"
              v-text="$t('pricing_page_feature_variant_b_3_desc')"
            />
          </div>
        </li>
      </template>
      <template v-else>
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
          <i18n-t
            keypath="pricing_page_feature_1"
            tag="span"
          >
            <template #voiceActor>
              <button
                v-if="isVoiceSampleEnabled"
                type="button"
                class="underline cursor-pointer"
                @click="handleShowVoiceSample"
                v-text="$t('pricing_page_feature_1_voice_actor')"
              />
              <span
                v-else
                v-text="$t('pricing_page_feature_1_voice_actor')"
              />
            </template>
          </i18n-t>
        </li>
        <li>
          <UIcon name="i-material-symbols-check" />
          <span v-text="$t('pricing_page_feature_2')" />
        </li>
      </template>
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
  // Shows a tier toggle beside the title and, on Civic, appends the
  // Civic-only benefits below the shared Plus list.
  isTierSelectorVisible?: boolean
  // The viewer's active tier, marked as "current plan" in the toggle.
  currentTier?: LikerPlusTier
  // Turns the voice-actor phrase into a sample-playing button. Only the pricing
  // page hosts the player modal, so it stays plain text everywhere else.
  isVoiceSampleEnabled?: boolean
}>(), {
  isTitleCenter: false,
  isTitleHidden: false,
  isDarkBackground: false,
  isAudioHidden: false,
  prependedFeatures: () => [],
  isTierSelectorVisible: false,
  currentTier: undefined,
  isVoiceSampleEnabled: false,
})

const emit = defineEmits<{ showVoices: [], showVoiceSample: [] }>()

const selectedTier = defineModel<LikerPlusTier>('tier', { default: 'plus' })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const { variant: benefitsCopyVariant, isVariant: isBenefitsCopyVariant } = useABTest({
  experimentKey: 'pricing-benefits-copy',
})

const tierOptions = computed<{ value: LikerPlusTier, label: string }[]>(() => [
  { value: 'plus', label: $t('pricing_page_tier_plus') },
  { value: 'civic', label: $t('pricing_page_tier_civic') },
])

const tierButtons = useTemplateRef<HTMLButtonElement[]>('tierButtons')

// The radio group uses a roving tabindex, so arrows are the only way to reach
// the unselected option by keyboard.
const TIER_ARROW_OFFSETS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

const tierToggleClass = computed(() => (props.isDarkBackground
  ? {
      track: 'bg-white/10',
      active: 'bg-theme-cyan/20 text-theme-cyan',
      inactive: 'text-white/50',
    }
  : {
      track: 'bg-theme-black/8 dark:bg-theme-white/8',
      active: 'bg-theme-white dark:bg-theme-black text-theme-black dark:text-theme-cyan shadow-sm',
      inactive: 'text-theme-black/40 dark:text-theme-white/40',
    }))

const benefitsTitle = computed(() => props.title || $t('pricing_page_subscription'))

const titleClass = computed(() => [
  props.isDarkBackground ? 'text-theme-cyan' : 'text-theme-black dark:text-theme-cyan',
  props.isTitleCenter ? 'text-center' : 'text-left',
  'font-bold',
  'border-b-2 border-current',
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
  useLogEvent('pricing_benefit_click_library', {
    pricing_benefits_variant: benefitsCopyVariant.value ?? undefined,
  })
}

function handleShowVoices() {
  useLogEvent('pricing_benefit_click_civic_voices')
  emit('showVoices')
}

function handleShowVoiceSample() {
  useLogEvent('pricing_benefit_click_voice_sample', {
    pricing_benefits_variant: benefitsCopyVariant.value ?? undefined,
  })
  emit('showVoiceSample')
}

function handleSelectTier(tier: LikerPlusTier) {
  if (tier === selectedTier.value) return
  useLogEvent('pricing_page_tier_select', { tier })
  selectedTier.value = tier
}

function handleTierKeydown(event: KeyboardEvent, index: number) {
  const offset = TIER_ARROW_OFFSETS[event.key]
  if (offset === undefined) return
  event.preventDefault()
  // Key repeat would otherwise oscillate the tiers, restarting the panel
  // transition and logging a select event every frame.
  if (event.repeat) return
  const options = tierOptions.value
  const nextIndex = (index + offset + options.length) % options.length
  const nextOption = options[nextIndex]
  if (!nextOption) return
  handleSelectTier(nextOption.value)
  tierButtons.value?.[nextIndex]?.focus()
}

// Also emits the tier switch, so `pricing_page_tier_select` counts every way
// into Civic while this event stays scoped to the CTA itself.
function handleUpgradeToCivic() {
  useLogEvent('pricing_page_civic_upgrade_cta_click')
  handleSelectTier('civic')
}
</script>
