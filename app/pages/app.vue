<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <!-- Hero Section -->
    <section
      id="hero"
      v-gsap.entrance.slide-bottom.stagger
      class="relative w-full overflow-hidden bg-theme-black"
    >
      <div class="relative max-w-5xl mx-auto px-6 md:px-12 py-20 md:py-28 grid md:grid-cols-2 items-center">
        <div class="relative max-md:order-2 flex flex-col items-center md:items-start space-y-6 laptop:-mr-40 text-center md:text-left">
          <div class="flex max-md:flex-col items-center justify-center md:justify-start gap-4">
            <img
              src="~/assets/images/about/app-icon.webp"
              alt="3ook Reader App"
              class="size-16 md:size-20 rounded-2xl"
            >
            <i18n-t
              class="text-3xl md:text-5xl font-bold text-white"
              keypath="app_page_hero_title"
              tag="h1"
            >
              <template #appName>
                <span class="whitespace-nowrap">3ook Reader</span>
              </template>
            </i18n-t>
          </div>

          <p
            class="text-lg text-gray-300 leading-relaxed max-w-lg"
            v-text="$t('app_page_hero_subtitle')"
          />

          <AppDownloadButtons
            class="*:text-theme-white *:ring-theme-white *:hover:bg-theme-white/20"
            @click-app-store="onClickAppStore"
            @click-google-play="onClickGooglePlay"
          />

          <p class="text-xs text-gray-500">
            {{ $t('app_page_platforms_ios') }} · {{ $t('app_page_platforms_android') }}
          </p>
        </div>

        <aside
          v-gsap.entrance.slide-right="{ delay: 0.4, duration: 1, ease: 'power1.out' }"
          class="max-md:absolute inset-0 flex justify-center self-stretch opacity-10! md:opacity-100! max-md:pointer-events-none"
        >
          <img
            v-gsap.entrance.fade="{ delay: 0.4, duration: 1, ease: 'power1.out' }"
            class="-my-40 max-md:scale-200 origin-center object-contain"
            src="~/assets/images/about/app-mockup.png"
            alt="3ook Reader App"
          >
        </aside>
      </div>
    </section>

    <!-- Features Section -->
    <section
      id="features"
      class="w-full max-w-4xl mx-auto px-6 py-16 md:py-24 space-y-10"
    >
      <h2
        class="text-2xl md:text-3xl font-bold text-gray-900 text-center"
        v-text="$t('app_page_features_title')"
      />

      <div
        v-gsap.whenVisible.once.stagger.from="{ y: 50, opacity: 0, duration: 0.6, stagger: 0.1 }"
        class="grid md:grid-cols-2 gap-6"
      >
        <UCard class="p-6 space-y-3">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-material-symbols-headphones-rounded"
              size="24"
              class="text-primary"
            />
            <h3
              class="text-xl font-semibold text-gray-900"
              v-text="$t('app_page_feature_background_audio_title')"
            />
          </div>
          <p
            class="mt-4 text-gray-700"
            v-text="$t('app_page_feature_background_audio_desc')"
          />
        </UCard>

        <UCard class="p-6 space-y-3">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-material-symbols-volume-up-rounded"
              size="24"
              class="text-primary"
            />
            <h3
              class="text-xl font-semibold text-gray-900"
              v-text="$t('app_page_feature_tts_title')"
            />
          </div>
          <p
            class="mt-4 text-gray-700"
            v-text="$t('app_page_feature_tts_desc')"
          />
        </UCard>

        <UCard class="p-6 space-y-3">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-material-symbols-sync-rounded"
              size="24"
              class="text-primary"
            />
            <h3
              class="text-xl font-semibold text-gray-900"
              v-text="$t('app_page_feature_universal_library_title')"
            />
          </div>
          <p
            class="mt-4 text-gray-700"
            v-text="$t('app_page_feature_universal_library_desc')"
          />
        </UCard>

        <UCard class="p-6 space-y-3">
          <div class="flex items-center gap-3">
            <UIcon
              name="i-material-symbols-notifications-active-rounded"
              size="24"
              class="text-primary"
            />
            <h3
              class="text-xl font-semibold text-gray-900"
              v-text="$t('app_page_feature_notifications_title')"
            />
          </div>
          <p
            class="mt-4 text-gray-700"
            v-text="$t('app_page_feature_notifications_desc')"
          />
        </UCard>
      </div>
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
          alt="3ook Reader running on laptop, tablet, and phone"
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
          @click-app-store="onClickCtaAppStore"
          @click-google-play="onClickCtaGooglePlay"
        />
      </UCard>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  colorMode: 'light',
})

const { t: $t } = useI18n()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const APP_STORE_URL = 'https://apps.apple.com/app/id6757783481'
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=land.liker.book3app'

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

const pageTitle = computed(() => $t('app_page_title'))
const pageDescription = computed(() => $t('app_page_meta_description'))
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
        'name': '3ook Reader',
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
