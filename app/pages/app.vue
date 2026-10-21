<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
    :is-tab-bar-visible="false"
  >
    <main>
      <header
        v-gsap.entrance.fade="{ duration: 0.8, ease: 'power1.out' }"
        class="fixed inset-x-0 top-0 z-30 bg-theme-black/85 backdrop-blur-md"
      >
        <div class="max-w-5xl mx-auto px-6 md:px-12 py-4 md:py-6 flex flex-wrap items-center gap-2">
          <NuxtLink
            class="shrink-0"
            :to="localeRoute({ name: 'about' })"
            title="3ook.com"
          >
            <img
              src="/logo.svg"
              alt="3ook.com"
              class="md:hidden size-8 block"
            >
            <AppLogo
              class="max-md:hidden"
              height="24"
              :is-icon="false"
              :is-padded="false"
              aria-label="3ook.com"
            />
          </NuxtLink>

          <button
            type="button"
            class="md:hidden ml-auto p-2.5 -mr-2.5 text-white cursor-pointer"
            :aria-label="$t('app_page_menu_toggle')"
            :aria-expanded="isMenuOpen"
            aria-controls="app-page-menu"
            @click="isMenuOpen = !isMenuOpen"
          >
            <UIcon
              :name="isMenuOpen ? 'i-material-symbols-close-rounded' : 'i-material-symbols-menu-rounded'"
              size="24"
            />
          </button>

          <!-- One nav for both sizes: inline on desktop, a wrapped second row on mobile when open -->
          <nav
            id="app-page-menu"
            :class="[
              'items-center justify-end gap-2 md:flex md:grow md:basis-auto',
              isMenuOpen ? 'flex flex-wrap basis-full pt-1' : 'max-md:hidden',
            ]"
          >
            <UButton
              v-for="item in menuItems"
              :key="item.key"
              :label="item.label"
              :to="item.to"
              variant="ghost"
              color="neutral"
              class="rounded-full text-gray-300 hover:text-white hover:bg-white/10"
              @click="isMenuOpen = false"
            />
          </nav>
        </div>
      </header>

      <!-- Hero Section -->
      <section
        id="hero"
        v-gsap.entrance.slide-bottom.stagger
        class="relative w-full overflow-hidden bg-theme-black"
      >
        <div class="relative max-w-5xl mx-auto px-6 md:px-12 pt-24 pb-20 md:pt-32 md:pb-28 grid md:grid-cols-2 items-center">
          <div class="relative max-md:order-2 flex flex-col items-center md:items-start space-y-6 text-center md:text-left">
            <div class="flex max-md:flex-col items-center justify-center md:justify-start gap-4">
              <img
                src="~/assets/images/about/app-icon.webp"
                :alt="$t('app_name')"
                class="size-16 md:size-20 rounded-2xl"
              >
              <i18n-t
                class="text-3xl md:text-4xl laptop:text-5xl font-bold text-white break-keep"
                keypath="app_page_hero_title"
                tag="h1"
              >
                <template #appName>
                  <span
                    class="whitespace-nowrap"
                    v-text="$t('app_name')"
                  />
                </template>
              </i18n-t>
            </div>

            <p
              class="text-lg text-gray-300 leading-relaxed max-w-lg"
              v-text="localizeCanto($t('app_page_hero_subtitle'))"
            />

            <AppDownloadButtons
              class="*:text-theme-white *:ring-theme-white *:hover:bg-theme-white/20"
              placement="app_page_hero"
              @click-app-store="onClickAppStore"
              @click-google-play="onClickGooglePlay"
            />
          </div>

          <aside
            v-gsap.entrance.slide-right="{ delay: 0.4, duration: 1, ease: 'power1.out' }"
            class="max-md:absolute inset-0 flex justify-center self-stretch opacity-10! md:opacity-100! max-md:pointer-events-none"
          >
            <img
              v-gsap.entrance.fade="{ delay: 0.4, duration: 1, ease: 'power1.out' }"
              class="-my-40 max-md:scale-200 origin-center object-contain"
              src="~/assets/images/about/app-mockup.webp"
              :alt="$t('app_name')"
              fetchpriority="high"
            >
          </aside>
        </div>
      </section>

      <!-- Features Section -->
      <section
        id="features"
        class="w-full max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-8"
      >
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900"
          v-text="$t('app_page_features_title')"
        />

        <div
          v-gsap.whenVisible.once.stagger.from="{ y: 50, opacity: 0, duration: 0.6, stagger: 0.1 }"
          class="grid gap-4 md:grid-cols-5 md:grid-rows-2"
        >
          <!-- Library: the headline feature, so it takes the tall cell -->
          <article class="relative overflow-hidden flex flex-col justify-between gap-10 min-h-96 p-8 md:p-10 rounded-3xl bg-theme-black text-white md:col-span-3 md:row-span-2">
            <div class="relative z-10 space-y-4">
              <span class="grid place-items-center size-12 rounded-full bg-theme-cyan text-theme-black">
                <UIcon
                  name="i-3ook-com-library-rounded"
                  class="size-6"
                />
              </span>
              <h3
                class="text-2xl md:text-4xl font-bold break-keep"
                v-text="$t('app_page_feature_library_title')"
              />
              <p
                class="md:text-lg text-gray-300"
                v-text="$t('app_page_feature_library_desc')"
              />
            </div>

            <div
              class="relative h-56 md:h-72"
              aria-hidden="true"
            >
              <img
                src="~/assets/images/app-page/cover-an.webp"
                alt=""
                class="absolute left-[4%] bottom-0 w-32 md:w-44 rounded-xl shadow-xl -rotate-6"
                loading="lazy"
                decoding="async"
              >
              <img
                src="~/assets/images/app-page/cover-travel.webp"
                alt=""
                class="absolute left-[26%] bottom-4 w-36 md:w-52 rounded-xl shadow-xl z-10"
                loading="lazy"
                decoding="async"
              >
              <img
                src="~/assets/images/app-page/cover-h.webp"
                alt=""
                class="absolute left-[50%] bottom-0 w-32 md:w-44 rounded-xl shadow-xl rotate-6"
                loading="lazy"
                decoding="async"
              >
            </div>
          </article>

          <!-- Narration -->
          <article class="flex flex-col justify-between gap-8 p-8 rounded-3xl bg-theme-cyan/20 text-gray-900 md:col-span-2">
            <div class="space-y-3">
              <span class="grid place-items-center size-12 rounded-full bg-theme-black text-theme-cyan">
                <UIcon
                  name="i-material-symbols-headphones-rounded"
                  class="size-6"
                />
              </span>
              <h3
                class="text-xl md:text-2xl font-bold break-keep"
                v-text="localizeCanto($t('app_page_feature_narration_title'))"
              />
              <p
                class="text-gray-700"
                v-text="localizeCanto($t('app_page_feature_narration_desc'))"
              />
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sample in voiceSamples"
                :key="sample.id"
                type="button"
                class="group flex items-center gap-2 py-1 pl-1 pr-4 rounded-full bg-white ring-1 ring-black/10 cursor-pointer transition-transform hover:-translate-y-px active:scale-[0.98]"
                :aria-label="`${$t('tts_sample_player_modal_play_button')} ${sample.title}`"
                @click="handleSampleClick(sample)"
              >
                <span class="relative shrink-0">
                  <img
                    :src="sample.avatarSrc"
                    alt=""
                    class="size-12 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  >
                  <span class="absolute inset-0 grid place-items-center rounded-full bg-black/35 text-white">
                    <UIcon
                      :name="isPlayingSample && activeTTSSampleId === sample.id ? 'i-material-symbols-pause-rounded' : 'i-material-symbols-play-arrow-rounded'"
                      class="size-6"
                    />
                  </span>
                </span>
                <span
                  class="text-sm font-semibold"
                  v-text="localizeCanto(sample.description)"
                />
              </button>
            </div>
          </article>

          <!-- Custom voice -->
          <article class="flex flex-col justify-between gap-8 p-8 rounded-3xl bg-gray-100 text-gray-900 md:col-span-2">
            <div class="space-y-3">
              <span class="grid place-items-center size-12 rounded-full bg-theme-black text-theme-cyan">
                <UIcon
                  name="i-material-symbols-mic-rounded"
                  class="size-6"
                />
              </span>
              <h3
                class="text-xl md:text-2xl font-bold break-keep"
                v-text="$t('app_page_feature_custom_voice_title')"
              />
              <p
                class="text-gray-700"
                v-text="$t('app_page_feature_custom_voice_desc')"
              />
            </div>
            <div
              class="relative size-14"
              aria-hidden="true"
            >
              <img
                src="~/assets/images/voice-avatars/custom-default.jpg"
                alt=""
                class="size-14 rounded-full object-cover ring-2 ring-white"
                loading="lazy"
                decoding="async"
              >
              <span class="absolute -right-1 -bottom-1 grid place-items-center size-6 rounded-full bg-theme-black text-theme-cyan ring-2 ring-gray-100">
                <UIcon
                  name="i-material-symbols-mic-rounded"
                  class="size-3.5"
                />
              </span>
            </div>
          </article>
        </div>

        <TTSSamplePlayerModal
          v-model:open="isPlayerModalOpen"
          :sample="modalSample"
          :is-playing="isPlayingSample"
          :is-loading="isLoadingSample"
          :progress-percentage="sampleProgress"
          :current-segment-index="currentSegmentIndex"
          :longest-segment-text="longestSegmentText"
          @toggle-playback="handleToggleSamplePlayback"
        />
      </section>

      <!-- Showcase Section -->
      <section
        id="showcase"
        class="w-full bg-theme-black py-16 md:py-20"
      >
        <div class="max-w-5xl mx-auto px-6 space-y-10 text-center">
          <div class="space-y-3">
            <h2
              class="text-2xl md:text-3xl font-bold text-white"
              v-text="$t('app_page_showcase_title')"
            />
            <p
              class="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed"
              v-text="$t('app_page_showcase_subtitle')"
            />
          </div>
          <img
            v-gsap.whenVisible.once="{ y: 30, opacity: 0, duration: 0.8, ease: 'power1.out' }"
            src="~/assets/images/mockup.png"
            :alt="$t('app_page_showcase_title')"
            class="w-full max-w-4xl mx-auto"
            loading="lazy"
            decoding="async"
          >
        </div>
      </section>

      <!-- Final CTA Section -->
      <section
        id="cta"
        class="px-6 py-16 md:py-20"
      >
        <UCard
          :ui="{
            root: 'w-full max-w-3xl mx-auto',
            body: 'flex flex-col items-center p-10 md:p-12 space-y-6 text-center',
          }"
        >
          <h2
            class="text-2xl md:text-3xl font-bold text-gray-900"
            v-text="$t('app_page_cta_title')"
          />
          <p
            class="text-lg text-muted max-w-xl mx-auto"
            v-text="$t('app_page_cta_subtitle')"
          />
          <AppDownloadButtons
            class="w-full max-w-md"
            placement="app_page_cta"
            @click-app-store="onClickCtaAppStore"
            @click-google-play="onClickCtaGooglePlay"
          />
          <p class="text-xs text-muted">
            {{ $t('app_page_platforms_ios') }} · {{ $t('app_page_platforms_android') }}
          </p>
        </UCard>
      </section>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { TTSSamplePlacement } from '~~/shared/constants/analytics'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '~/utils/app-store'

definePageMeta({
  layout: false,
  colorMode: 'light',
})

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const { handleError } = useErrorHandler()
const route = useRoute()

// 粵語 is the default wording; the UK/HK book fair campaign uses the colloquial 廣東話.
const BOOKFAIR_CAMPAIGN = 'ukhkbookfair2026'
const isCanto = computed(() => route.query.utm_campaign === BOOKFAIR_CAMPAIGN)
function localizeCanto(text: string) {
  return isCanto.value ? text.replaceAll('粵語', '廣東話') : text
}

const VOICE_SAMPLE_PLACEMENT: TTSSamplePlacement = 'app-page'
const isPlayerModalOpen = ref(false)

const {
  samples: voiceSamples,
  activeSample: activeTTSSample,
  activeSampleId: activeTTSSampleId,
  currentSegmentIndex,
  longestSegmentText,
  isPlaying: isPlayingSample,
  isLoading: isLoadingSample,
  progressPercentage: sampleProgress,
  play: playSample,
  stop: stopSample,
  togglePlayback: toggleSamplePlayback,
} = useTTSSamplesPlayer({
  onError: (error: unknown) => handleError(error),
  onEnd: () => {
    useLogTTSSample('play_complete', { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
    isPlayerModalOpen.value = false
  },
})

// The modal subtitle is the sample's language label, which comes from shared strings.
const modalSample = computed(() => {
  const sample = activeTTSSample.value
  return sample && isCanto.value
    ? { ...sample, description: localizeCanto(sample.description) }
    : sample
})

watch(isPlayerModalOpen, (open) => {
  if (open) return
  if (activeTTSSampleId.value) {
    useLogTTSSample('stop', { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
    stopSample()
  }
})

function handleToggleSamplePlayback() {
  useLogTTSSample(toggleSamplePlayback(), { sample: activeTTSSample.value, placement: VOICE_SAMPLE_PLACEMENT })
}

function handleSampleClick(sample: { id: string }) {
  if (isPlayingSample.value && activeTTSSampleId.value === sample.id) {
    isPlayerModalOpen.value = false
    return
  }
  const playingSample = playSample(sample.id)
  isPlayerModalOpen.value = true
  useLogTTSSample('play', { sample: playingSample, placement: VOICE_SAMPLE_PLACEMENT })
}

const isMenuOpen = ref(false)
const menuItems = computed(() => [
  { key: 'store', label: $t('tab_bar_store'), to: localeRoute({ name: 'store' }) },
  { key: 'library', label: $t('tab_bar_library'), to: localeRoute({ name: 'library' }) },
  { key: 'shelf', label: $t('tab_bar_shelf'), to: localeRoute({ name: 'shelf' }) },
  { key: 'account', label: $t('tab_bar_user'), to: localeRoute({ name: 'account' }) },
])
const config = useRuntimeConfig()

const baseURL = config.public.baseURL

function onClickAppStore() {
  useLogEvent('app_page_hero_app_store_click')
}

function onClickGooglePlay() {
  useLogEvent('app_page_hero_google_play_click')
}

function onClickCtaAppStore() {
  useLogEvent('app_page_cta_app_store_click')
}

function onClickCtaGooglePlay() {
  useLogEvent('app_page_cta_google_play_click')
}

const pageTitle = computed(() => localizeCanto($t('app_page_title')))
const pageDescription = computed(() => localizeCanto($t('app_page_meta_description')))
const canonicalURL = computed(() => `${baseURL}/app`)

useHead({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDescription.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:image', content: `${baseURL}/images/og/default.jpg` },
    { property: 'og:url', content: canonicalURL.value },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle.value },
    { name: 'twitter:description', content: pageDescription.value },
    { name: 'twitter:image', content: `${baseURL}/images/og/default.jpg` },
    { name: 'apple-itunes-app', content: 'app-id=6757783481' },
    { name: 'google-play-app', content: 'app-id=land.liker.book3app' },
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
    { rel: 'alternate', href: APP_STORE_URL, media: 'only screen and (max-width: 640px)' },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        'name': $t('app_name'),
        'description': pageDescription.value,
        'url': canonicalURL.value,
        'applicationCategory': 'BookApplication',
        'operatingSystem': 'iOS, Android',
        'image': `${baseURL}/images/og/default.jpg`,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
        },
        'installUrl': [APP_STORE_URL, GOOGLE_PLAY_URL],
        'publisher': {
          '@type': 'Organization',
          'name': '3ook.com',
          'url': baseURL,
          'logo': `${baseURL}/images/og/default.jpg`,
        },
      }),
    },
  ],
})
</script>
