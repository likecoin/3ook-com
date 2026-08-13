<template>
  <div
    :class="[
      'flex',
      'flex-col',
      'laptop:flex-row',
      'items-stretch',
      'w-full',
    ]"
  >
    <div class="relative">
      <slot name="header-action" />
    </div>

    <template v-if="isDesktopScreen && isShowTTSSamples">
      <aside class="relative flex justify-end w-full bg-theme-black min-h-max overflow-hidden">
        <PaywallBookstoreBackdrop class="!opacity-20" />
        <div
          :class="[
            'flex',
            'flex-col',
            { 'justify-center': !campaignContent },
            'items-center',
            'relative',
            'w-full',
            'max-w-[512px]',
            'min-h-max',
            { 'laptop:py-12': !campaignContent },
          ]"
        >
          <LazyPlusBlocktrendBundleBanner
            v-if="isBlocktrendCampaign"
            class="w-full shrink-0"
            :is-force-landscape="true"
            :is-dark-background="true"
          />
          <LazyPricingPageCampaignMedia
            v-else-if="campaignContent"
            class="w-full shrink-0"
            :campaign-id="campaignContent.id"
            orientation="landscape"
          />
          <div :class="['p-12', { 'pt-30': !campaignContent }]">
            <div
              v-if="!campaignContent"
              class="relative flex items-center mb-12"
            >
              <NuxtLink :to="localeRoute({ name: 'store', query: { ll_medium: 'plus-logo', ll_source: 'plus-modal' } })">
                <AppLogo
                  height="48"
                  :is-icon="false"
                  :is-padded="false"
                />
              </NuxtLink>
            </div>

            <PricingPageIntroSection
              v-model:tier="selectedTier"
              class="relative w-full max-w-[420px]"
              :is-dark-background="true"
              :title="campaignContent?.title ?? fallbackTitle"
              :description="campaignContent?.description"
              :prepended-features="prependedFeatures"
              :is-tier-selector-visible="isTierSelectorVisible"
              :current-tier="likerPlusTier"
              @show-voices="isVoicesModalOpen = true"
            />
          </div>
        </div>
      </aside>
    </template>
    <template v-else>
      <LazyPlusBlocktrendBundleBanner
        v-if="isBlocktrendCampaign"
        class="max-laptop:shrink-0 w-full min-h-max"
      />
      <aside
        v-else-if="campaignContent"
        :class="[
          'relative',
          'max-laptop:shrink-0',
          'w-full',
          'min-h-max',
          'bg-theme-black',
          'laptop:sticky',
          'laptop:top-0',
          'laptop:self-start',
          'laptop:h-screen',
        ]"
      >
        <ClientOnly>
          <div
            v-if="isDesktopScreen"
            class="absolute inset-0 overflow-hidden"
          >
            <LazyPricingPageCampaignMedia
              class="absolute inset-x-0 w-full top-1/2 -translate-y-1/2"
              :campaign-id="campaignContent.id"
              orientation="portrait"
            />
          </div>
          <LazyPricingPageCampaignMedia
            v-else
            class="w-full"
            :campaign-id="campaignContent.id"
            orientation="landscape"
          />
        </ClientOnly>
      </aside>
      <aside
        v-else
        :class="[
          'relative',
          'flex',
          'justify-center',
          'items-center',
          'max-laptop:shrink-0',
          'w-full',
          'p-6 laptop:p-12',
          'bg-theme-black',
          'overflow-clip',
          'laptop:sticky',
          'laptop:top-0',
          'laptop:self-start',
          'laptop:h-screen',
        ]"
      >
        <PaywallBookstoreBackdrop />
        <div class="relative flex flex-col items-center w-full">
          <NuxtLink
            class="flex justify-center items-center w-full"
            :to="localeRoute({ name: 'store', query: { ll_medium: 'plus-logo', ll_source: 'plus-modal' } })"
          >
            <AppLogo
              class="max-w-2/3 max-laptop:h-16 laptop:h-auto"
              height="128"
              :is-icon="false"
              :is-padded="false"
            />
          </NuxtLink>
          <!-- The tagline is laptop-only to keep the mobile banner above the fold slim -->
          <p
            class="hidden laptop:block max-w-[420px] mt-4 text-center text-white/70"
            v-text="$t('about_page_hero_title')"
          />
        </div>
      </aside>
    </template>

    <div class="flex w-full min-h-max">
      <div
        :class="[
          'flex',
          'flex-col',
          'w-full',
          'max-w-[512px]',
          'max-laptop:mx-auto',
          'p-5 laptop:p-12',
          'pt-8 laptop:pt-12',
          // NOTE: Prevent content from being covered by the Intercom banner at the top
          { 'laptop:pt-16': !campaignContent },
        ]"
      >
        <div class="grow">
          <slot name="affiliate-alert" />
          <PricingPageIntroSection
            v-if="!(isShowTTSSamples && isDesktopScreen)"
            v-model:tier="selectedTier"
            class="mb-4 laptop:mb-6"
            :title="campaignContent?.title ?? fallbackTitle"
            :description="campaignContent?.description"
            :prepended-features="prependedFeatures"
            :is-tier-selector-visible="isTierSelectorVisible"
            :current-tier="likerPlusTier"
            @show-voices="isVoicesModalOpen = true"
          />
          <TTSSamplesSection
            v-if="isShowTTSSamples"
            :affiliate-voices="affiliateVoices"
            :affiliate-liker-id="affiliateLikerId"
            :affiliate-exclusive-badge-text="ttsExclusiveBadgeText"
          />
          <slot name="affiliate-promo" />
        </div>

        <div class="flex flex-col w-full mt-6 laptop:mt-8">
          <slot name="pricing">
            <Transition
              mode="out-in"
              :css="false"
              @enter="handlePricingPanelEnter"
              @leave="handlePricingPanelLeave"
            >
              <div
                v-if="canStartSubscribeFlow"
                :key="selectedTier"
                :class="{ 'bg-theme-cyan p-3 rounded-xl text-theme-black': isPaidTrialChrome }"
              >
                <header
                  v-if="isPaidTrialChrome"
                  class="hidden laptop:flex items-center gap-2 mb-3 text-theme-black"
                >
                  <UIcon
                    name="i-material-symbols-celebration-outline-rounded"
                    :size="24"
                  />
                  <span
                    class="font-bold"
                    v-text="$t('subscribe_plus_alert_limited_offer')"
                  />
                </header>
                <PricingPlanSelect
                  v-model="selectedPlan"
                  :tier="selectedTier"
                  :trial-period-days="trialPeriodDays"
                  :is-paid-trial-override="isPaidTrialOverride"
                  :trial-price-string="trialPriceString"
                  :monthly-price-string="monthlyPriceString"
                  :yearly-price-string="yearlyPriceString"
                  :yearly-badge-text="yearlyBadgeText"
                  :monthly-badge-text="monthlyBadgeText"
                  :promo-pricing="promoPricing"
                >
                  <template #header-left>
                    <div
                      v-if="isPaidTrialChrome"
                      class="flex items-center gap-1.5 text-theme-black"
                    >
                      <UIcon
                        name="i-material-symbols-celebration-outline-rounded"
                        :size="20"
                      />
                      <span
                        class="text-sm font-bold"
                        v-text="$t('subscribe_plus_alert_limited_offer')"
                      />
                    </div>
                  </template>
                </PricingPlanSelect>
                <div
                  v-if="$slots['cta-mobile']"
                  class="laptop:hidden mt-4"
                >
                  <slot name="cta-mobile" />
                </div>
                <UButton
                  :class="['mt-4', { 'max-laptop:hidden': $slots['cta-mobile'] }]"
                  :label="subscribeButtonLabel"
                  block
                  size="xl"
                  :disabled="isPlusCurrentPlan"
                  :loading="props.isProcessingSubscription"
                  :ui="{ base: 'py-2 laptop:py-3 cursor-pointer', label: 'font-bold' }"
                  @click="handleSubscribeButtonClick"
                />
                <p
                  v-if="!isPlusCurrentPlan"
                  :class="[
                    'mt-2 text-center text-xs opacity-70',
                    { 'max-laptop:hidden': $slots['cta-mobile'] },
                  ]"
                  v-text="$t('pricing_page_cancel_anytime')"
                />
              </div>
            </Transition>

            <slot name="pricing-footer" />

            <UAlert
              v-if="!isApp && coupon && !promoPricing && !isCivicTierSelected"
              class="mt-4"
              color="secondary"
              variant="soft"
              icon="i-material-symbols-percent-discount-outline-rounded"
              :description="$t('pricing_page_coupon_applied_description')"
              :ui="{
                root: 'rounded-xl',
                title: 'font-bold',
              }"
            >
              <template #title>
                <i18n-t keypath="pricing_page_coupon_applied_title">
                  <template #code>
                    <UBadge
                      class="font-bold font-mono"
                      :label="coupon"
                      color="primary"
                      variant="soft"
                    />
                  </template>
                </i18n-t>
              </template>
            </UAlert>

            <UButton
              class="mt-4 self-center"
              :label="$t('pricing_page_learn_more')"
              :to="learnMoreRoute"
              variant="link"
              color="neutral"
              size="sm"
              :ui="{ label: 'border-b border-current leading-5' }"
            />
          </slot>
        </div>

        <p
          v-if="hasAffiliateVoices"
          class="mt-8 text-center text-xs text-dimmed"
        >
          <UIcon
            name="i-material-symbols-info-outline-rounded"
            class="mr-0.5 align-middle"
          />
          <i18n-t
            keypath="tts_samples_section_affiliate_books_note"
            tag="span"
          >
            <template #selectedBooksOnly>
              <UButton
                class="inline p-0 rounded-none border-b border-current text-xs leading-5"
                variant="link"
                color="neutral"
                :label="$t('tts_samples_section_affiliate_books_note_selected_books_only')"
                @click="isAffiliateBooksModalOpen = true"
              />
            </template>
          </i18n-t>
        </p>

        <AffiliateBooksModal
          v-if="affiliateLikerId"
          v-model:open="isAffiliateBooksModalOpen"
          :affiliate-liker-id="affiliateLikerId"
        />

        <PlusVoicesModal v-model:open="isVoicesModalOpen" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PricingPageContentProps } from './PricingPageContent.props'
import { resolveIsPaidTrial } from '~~/shared/utils/pricing'
import { getSystemVoiceByOwnerLikerId } from '~~/shared/utils/tts-sample'

const localeRoute = useLocaleRoute()
const isDesktopScreen = useDesktopScreen()
const { t: $t } = useI18n()
const getRouteQuery = useRouteQuery()
const { isApp } = useAppDetection()
const { canStartSubscribeFlow, ensureOfferings } = useNativeIAP()
const { isLikerPlus, isCivicMember, likerPlusTier, isPlanPeriodUpgrade } = useSubscription()
const { isCivicOfferable } = usePlusEligibility()

const emit = defineEmits<{
  'open': []
  'subscribe': [payload: {
    trialPeriodDays?: number
    mustCollectPaymentMethod?: boolean
    plan: SubscriptionPlan
    tier?: LikerPlusTier
    utmCampaign?: string
    utmMedium?: string
    utmSource?: string
  }]
  'update:modelValue': [value: SubscriptionPlan]
}>()

const props = withDefaults(
  defineProps<PricingPageContentProps>(),
  {
    isProcessingSubscription: false,
  },
)

// The Plus/Civic tier the pricing box and feature list reflect. Only 'civic'
// when a deep link asks for it, or the toggle is offered and picked;
// otherwise the page stays Plus-only.
const selectedTier = ref<LikerPlusTier>(
  props.isCivicVisible && props.initialTier === 'civic' ? 'civic' : 'plus',
)
const isCivicTierSelected = computed(() => selectedTier.value === 'civic')

const gsap = useGSAP()
const PRICING_PANEL_SCALE = 0.95

function handlePricingPanelEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { scale: PRICING_PANEL_SCALE, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3, delay: 0.2, ease: 'power2.out', onComplete: done },
  )
}

function handlePricingPanelLeave(el: Element, done: () => void) {
  gsap.to(el, {
    scale: PRICING_PANEL_SCALE,
    opacity: 0,
    // Matches the 200ms ease-out of UCollapsible's expand/collapse animation.
    duration: 0.2,
    ease: 'power1.out',
    onComplete: done,
  })
}
const isVoicesModalOpen = ref(false)

const isTierSelectorVisible = computed(() =>
  props.isCivicVisible && isCivicOfferable.value && canStartSubscribeFlow.value)

// Plus members are kept on /member for the Civic upsell (see member.vue), so open
// on the Civic view rather than the Plus box with its new-subscriber CTA. Seed
// once, the first time the member is known; a later manual toggle then stands.
// Gate on SSR-stable inputs (session + isCivicVisible), NOT the native-bridge-
// dependent isTierSelectorVisible, so server and client seed the same tier and the
// pricing box doesn't hydrate-mismatch in-app. Ineligible members are redirected
// off /member by member.vue, so seeding Civic for them is moot.
let hasSeededCivicDefault = false
watchImmediate([isLikerPlus, isCivicMember], ([isPlus, isCivic]) => {
  if (hasSeededCivicDefault) return
  if (props.isCivicVisible && isPlus && !isCivic) {
    selectedTier.value = 'civic'
    hasSeededCivicDefault = true
  }
})

// A deep link or the post-login Plus-member seeding can select Civic where it
// can't be sold (an app shell without the Civic IAP), leaving no toggle back to
// Plus. Correct after mount: checking during setup would hydrate-mismatch.
onMounted(() => {
  watchImmediate([isTierSelectorVisible, isCivicTierSelected], ([isVisible, isCivicSelected]) => {
    if (!isVisible && isCivicSelected) selectedTier.value = 'plus'
  })
})

const isCustomVoiceCampaign = computed(() => {
  return getRouteQuery('utm_campaign').includes('custom-voice')
})

const hasAffiliateVoices = computed(() => (props.affiliateVoices?.length ?? 0) > 0)

const isAffiliateBooksModalOpen = ref(false)

// A referrer owning a built-in voice has no affiliate voices, but their sample
// is still the reason they shared the link — show the samples card for them.
const hasReferrerSystemVoice = computed(() => !!getSystemVoiceByOwnerLikerId(props.affiliateLikerId))

const isTTSSamplesForceHidden = computed(() => getRouteQuery('samples') === '0')

const shouldShowTTSSamples = computed(() => {
  if (isTTSSamplesForceHidden.value) return false
  return getRouteQuery('samples') === '1' || isCustomVoiceCampaign.value
    || hasAffiliateVoices.value || hasReferrerSystemVoice.value
})

const ttsSamplesABTest = shouldShowTTSSamples.value || isTTSSamplesForceHidden.value
  ? undefined
  : useABTest({
      experimentKey: computed(() => isDesktopScreen.value
        ? 'pricing-page-tts-sample-desktop'
        : 'pricing-page-tts-sample-mobile'),
    })

const isShowTTSSamples = computed(() => shouldShowTTSSamples.value || ttsSamplesABTest?.isVariant('tts-sample'))

const utmCampaign = computed(() => {
  return getRouteQuery('utm_campaign') || props.utmCampaign
})
const campaignId = computed(() => {
  return getRouteQuery('utm_term') || getRouteQuery('utm_campaign')
})

const {
  campaignContent,
  isBlocktrendCampaign,
} = usePricingPageCampaign({
  campaignId,
  affiliateLikerId: () => props.affiliateLikerId,
})

// NOTE: This could be simplified by computed, but props not updated after `open()` in `useOverlay()`
const selectedPlan = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: 'yearly',
})

// A logged-in Plus member owns Plus already, so the Plus tab is informational —
// their current plan — with one real action: switching monthly → yearly.
const isPlusMemberOnPlusTab = computed(() =>
  isLikerPlus.value && !isCivicMember.value && !isCivicTierSelected.value,
)
const isPlusPeriodUpgrade = computed(() =>
  isPlusMemberOnPlusTab.value && isPlanPeriodUpgrade(selectedPlan.value),
)
const isPlusCurrentPlan = computed(() =>
  isPlusMemberOnPlusTab.value && !isPlusPeriodUpgrade.value,
)

const isPaidTrial = computed(() => resolveIsPaidTrial(props.trialPeriodDays, props.isPaidTrialOverride))
// Civic has no trial, and an existing member is never in a trial-acquisition flow,
// so the paid-trial celebration chrome never applies to either.
const isPaidTrialChrome = computed(() =>
  isPaidTrial.value && !isCivicTierSelected.value && !isPlusMemberOnPlusTab.value)

const route = useRoute()
const getRouteBaseName = useRouteBaseName()
const learnMoreRoute = computed(() => {
  if (getRouteBaseName(route) === 'about' || getRouteQuery('ll_source') === 'about-page') {
    return localeRoute({ name: 'store' })
  }
  return localeRoute({ name: 'about', query: { ll_medium: 'about-link', ll_source: 'plus-modal' } })
})

const subscribeButtonLabel = computed(() => {
  if (isCivicTierSelected.value) {
    return isLikerPlus.value
      ? $t('pricing_page_civic_upgrade_button')
      : $t('pricing_page_civic_subscribe_button')
  }
  if (isPlusPeriodUpgrade.value) {
    return $t('pricing_page_switch_to_yearly')
  }
  if (isPlusCurrentPlan.value) {
    return $t('pricing_page_current_plan')
  }
  if (isCustomVoiceCampaign.value) {
    return $t('plus_subscribe_cta_custom_voice_free')
  }
  if (props.trialPeriodDays) {
    if (isPaidTrial.value) {
      return $t('plus_subscribe_cta_enjoy_offer')
    }
    return $t('plus_subscribe_cta_start_free_trial', { days: props.trialPeriodDays })
  }
  return $t('plus_subscribe_cta_continue')
})

onMounted(() => {
  emit('open')

  // No-op outside the app or on shells without Civic IAP; loads store prices
  // so the Civic toggle can show the store-formatted price in-app.
  ensureOfferings('civic')

  if (campaignContent.value) {
    useLogEvent(`pricing_page_campaign_${campaignContent.value.id}`)
  }
})

function handleSubscribe(overrides: {
  plan: SubscriptionPlan
  tier?: LikerPlusTier
  trialPeriodDays?: number
  mustCollectPaymentMethod?: boolean
}) {
  emit('subscribe', {
    utmCampaign: utmCampaign.value,
    utmMedium: props.utmMedium,
    utmSource: props.utmSource,
    ...overrides,
  })
}

function handleSubscribeButtonClick() {
  const plan = selectedPlan.value ?? 'yearly'
  // Civic never has a trial (product decision), so no trial fields here.
  if (isCivicTierSelected.value) {
    handleSubscribe({ plan, tier: 'civic', mustCollectPaymentMethod: props.mustCollectPaymentMethod })
    return
  }
  handleSubscribe({
    plan,
    mustCollectPaymentMethod: props.mustCollectPaymentMethod,
    trialPeriodDays: props.trialPeriodDays,
  })
}
</script>
