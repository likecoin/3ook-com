<template>
  <NuxtLayout
    name="default"
    :is-footer-visible-in-mobile="true"
  >
    <AppHeader :is-connect-hidden="false" />

    <!-- Hero Section with Banner -->
    <section
      class="flex flex-col justify-center items-center text-center space-y-16 min-h-[70vh] px-8 py-20 bg-cover bg-center"
      :style="{
        backgroundColor: '#131313', // For initial rendering
        backgroundImage: `url(${heroBackdropImage})`,
      }"
    >
      <AppLogo
        class="w-full max-w-lg"
        height="auto"
        fill="white"
      />

      <div class="space-y-4 text-gray-100">
        <h1
          class="text-4xl md:text-5xl font-bold"
          v-text="$t('about_page_hero_title')"
        />
        <p
          class="text-xl max-w-3xl mx-auto leading-relaxed"
          v-text="$t('about_page_hero_subtitle')"
        />
      </div>
    </section>

    <div class="w-full max-w-4xl mx-auto px-4 pt-12 py-16 space-y-12">
      <!-- What is 3ook.com Section -->
      <h2
        class="text-2xl md:text-3xl text-center font-bold text-gray-900 mb-4"
        v-text="$t('about_page_what_is_title')"
      />
      <p
        class="text-lg text-gray-700 leading-relaxed"
        v-text="$t('about_page_what_is_content')"
      />

      <!-- Key Features Section -->
      <section class="space-y-6">
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900 text-center"
          v-text="$t('about_page_features_title')"
        />

        <div class="grid md:grid-cols-2 gap-6">
          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-volume-up-rounded"
                size="24"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t('about_page_feature_ai_narration')"
              />
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_ai_narration_desc')"
            />
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-auto-stories-rounded"
                size="24"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t('about_page_feature_dual_format')"
              />
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_dual_format_desc')"
            />
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-store-rounded"
                size="24"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t('about_page_feature_web3')"
              />
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_web3_desc')"
            />
          </UCard>

          <UCard class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-handshake-rounded"
                size="24"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t('about_page_feature_author_benefits')"
              />
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_author_benefits_desc')"
            />
          </UCard>
        </div>
      </section>
    </div>

    <!-- Mission Section -->
    <div class="p-8 py-12 bg-gradient-to-r from-primary/10 to-secondary/20">
      <div class="max-w-4xl mx-auto text-center space-y-6">
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
          v-text="$t('about_page_mission_title')"
        />
        <p
          class="text-lg text-gray-700 leading-relaxed"
          v-text="$t('about_page_mission_content')"
        />
      </div>
    </div>

    <div class="w-full max-w-4xl mx-auto px-4 py-12 space-y-12">
      <!-- Team Section -->
      <section>
        <h2
          class="text-2xl md:text-3xl text-center font-bold text-gray-900 mb-4"
          v-text="$t('about_page_team_title')"
        />
        <p
          class="text-lg text-gray-700 text-center leading-relaxed"
          v-text="$t('about_page_team_content')"
        />
      </section>

      <!-- Platform Evolution Section -->
      <section>
        <h2
          class="text-2xl md:text-3xl text-center font-bold text-gray-900 mb-4"
          v-text="$t('about_page_platform_title')"
        />
        <p
          class="text-lg text-gray-700 text-center leading-relaxed"
          v-text="$t('about_page_platform_evolution')"
        />
      </section>

      <!-- Get Started Section -->
      <UCard
        :ui="{ body: 'p-12 sm:py-12 space-y-4 text-center' }"
      >
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900"
          v-text="$t('about_page_contact_title')"
        />
        <p
          class="text-lg text-gray-600 max-w-2xl mx-auto"
          v-text="$t('about_page_contact_content')"
        />
        <div class="flex flex-row flex-wrap gap-4 justify-center">
          <UButton
            to="https://docs.3ook.com?utm_source=3ookcom&utm_medium=referral&utm_campaign=about_page"
            :label="$t('account_page_faq')"
            target="_blank"
            variant="outline"
            size="lg"
          />
          <UButton
            :to="localeRoute({ name: 'store' })"
            :label="$t('app_header_store')"
            color="primary"
            size="lg"
            icon="i-material-symbols-store-rounded"
          />
        </div>
      </UCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import heroBackdropImage from '~/assets/images/hero-backdrop.jpg'

definePageMeta({ layout: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const pageTitle = computed(() => $t('about_page_title'))
const pageDescription = computed(() => $t('about_page_hero_subtitle'))
const canonicalURL = computed(() => `${baseURL}/about`)

useHead({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDescription.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:image', content: `${baseURL}/images/og/default.jpg` },
    { property: 'og:url', content: canonicalURL.value },
    { property: 'og:type', content: 'website' },
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
})
</script>
