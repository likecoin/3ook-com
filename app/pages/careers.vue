<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <main>
      <!-- Hero / Mission Section -->
      <section
        id="hero"
        v-gsap.entrance.slide-bottom.stagger
        class="flex flex-col justify-center items-center text-center space-y-8 min-h-[50vh] px-8 py-20 bg-theme-black bg-center"
      >
        <div class="space-y-4 text-gray-100">
          <h1
            class="text-3xl md:text-5xl font-bold"
            v-text="$t('careers_page_hero_title')"
          />
          <p
            class="text-lg max-w-3xl mx-auto leading-relaxed"
            v-text="$t('careers_page_hero_subtitle')"
          />
        </div>

        <div class="flex flex-wrap justify-center items-center gap-4">
          <UButton
            class="text-theme-white hover:bg-theme-white/20"
            :to="localeRoute({ name: 'about' })"
            :label="$t('careers_page_hero_about_link')"
            color="neutral"
            variant="ghost"
            size="xl"
            icon="i-material-symbols-info-outline-rounded"
            @click="onClickAboutLink"
          />
          <UButton
            class="text-theme-white hover:bg-theme-white/20"
            to="https://publish.3ook.com/about"
            target="_blank"
            rel="noopener"
            :label="$t('careers_page_hero_publish_link')"
            color="neutral"
            variant="ghost"
            size="xl"
            icon="i-material-symbols-menu-book-outline-rounded"
            trailing-icon="i-material-symbols-open-in-new-rounded"
            @click="onClickPublishLink"
          />
          <UButton
            class="text-theme-cyan ring-theme-cyan hover:bg-theme-cyan/20"
            :to="`mailto:${jobsEmail}`"
            :label="$t('careers_page_hero_cta')"
            color="neutral"
            variant="outline"
            size="xl"
            icon="i-material-symbols-mail-outline-rounded"
            @click="onClickHeroCta"
          />
        </div>
      </section>

      <div class="w-full max-w-4xl mx-auto px-4 pt-12 py-16 space-y-20">
        <!-- Mission Section -->
        <section
          id="mission"
          class="space-y-4 text-center"
        >
          <h2
            class="text-2xl md:text-3xl font-bold text-gray-900"
            v-text="$t('careers_page_mission_title')"
          />
          <p
            class="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto"
            v-text="$t('careers_page_mission_content')"
          />
        </section>

        <!-- Culture Section -->
        <section
          id="culture"
          class="space-y-6"
        >
          <div class="text-center space-y-2">
            <h2
              class="text-2xl md:text-3xl font-bold text-gray-900"
              v-text="$t('careers_page_culture_title')"
            />
            <p
              class="text-lg text-muted leading-relaxed max-w-2xl mx-auto"
              v-text="$t('careers_page_culture_content')"
            />
          </div>

          <div
            v-gsap.whenVisible.once.stagger.from="{ y: 40, opacity: 0, duration: 0.5, stagger: 0.1 }"
            class="grid md:grid-cols-3 gap-6"
          >
            <UCard
              v-for="value in cultureValues"
              :key="value.key"
              class="p-6 space-y-3"
            >
              <UIcon
                :name="value.icon"
                size="28"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t(`careers_page_culture_${value.key}_title`)"
              />
              <p
                class="text-gray-700"
                v-text="$t(`careers_page_culture_${value.key}_desc`)"
              />
            </UCard>
          </div>
        </section>

        <!-- Hiring Areas Section -->
        <section
          id="areas"
          class="space-y-6"
        >
          <div class="text-center space-y-2">
            <h2
              class="text-2xl md:text-3xl font-bold text-gray-900"
              v-text="$t('careers_page_areas_title')"
            />
            <p
              class="text-lg text-muted leading-relaxed max-w-2xl mx-auto"
              v-text="$t('careers_page_areas_content')"
            />
          </div>

          <div
            v-gsap.whenVisible.once.stagger.from="{ y: 40, opacity: 0, duration: 0.5, stagger: 0.1 }"
            class="grid md:grid-cols-3 gap-6"
          >
            <UCard
              v-for="area in hiringAreas"
              :key="area.key"
              class="p-6 space-y-3"
            >
              <UIcon
                :name="area.icon"
                size="28"
                class="text-primary"
              />
              <h3
                class="text-xl font-semibold text-gray-900"
                v-text="$t(`careers_page_area_${area.key}_title`)"
              />
              <p
                class="text-gray-700"
                v-text="$t(`careers_page_area_${area.key}_desc`)"
              />
            </UCard>
          </div>
        </section>

        <!-- Open Positions Section -->
        <section
          id="positions"
          class="space-y-6"
        >
          <div class="text-center space-y-2">
            <h2
              class="text-2xl md:text-3xl font-bold text-gray-900"
              v-text="$t('careers_page_positions_title')"
            />
            <p
              class="text-lg text-muted leading-relaxed max-w-2xl mx-auto"
              v-text="$t('careers_page_positions_content')"
            />
          </div>

          <div
            v-gsap.whenVisible.once.stagger.from="{ y: 30, opacity: 0, duration: 0.4, stagger: 0.1 }"
            class="space-y-4"
          >
            <UCard
              v-for="job in openPositions"
              :key="job.key"
              :ui="{ body: 'flex flex-col md:flex-row md:items-center gap-4' }"
            >
              <div class="flex-1 space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3
                    class="text-xl font-semibold text-gray-900"
                    v-text="$t(`careers_page_job_${job.key}_title`)"
                  />
                  <UBadge
                    color="primary"
                    variant="subtle"
                    size="sm"
                    :label="$t(`careers_page_job_${job.key}_type`)"
                  />
                </div>
                <p
                  class="text-gray-700 leading-relaxed"
                  v-text="$t(`careers_page_job_${job.key}_desc`)"
                />
              </div>
              <UButton
                class="shrink-0 self-start md:self-center"
                :to="getApplyMailto(job.key)"
                :label="$t('careers_page_apply_button')"
                color="primary"
                size="lg"
                icon="i-material-symbols-send-rounded"
                @click="onClickApply(job.key)"
              />
            </UCard>
          </div>
        </section>
      </div>

      <!-- Open Application CTA Section -->
      <section
        id="apply"
        class="px-6 md:px-12 py-12"
      >
        <UCard
          :ui="{
            root: 'w-full max-w-4xl mx-auto',
            body: 'flex flex-col items-center p-12 sm:py-12 space-y-4 text-center',
          }"
        >
          <h2
            class="text-2xl md:text-3xl font-bold text-gray-900"
            v-text="$t('careers_page_open_title')"
          />
          <p
            class="text-lg text-muted max-w-2xl mx-auto"
            v-text="$t('careers_page_open_content')"
          />
          <UButton
            :to="`mailto:${jobsEmail}`"
            :label="$t('careers_page_open_button')"
            color="primary"
            size="lg"
            icon="i-material-symbols-mail-outline-rounded"
            @click="onClickOpenApplication"
          />
        </UCard>
      </section>
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
// Preload gsap chunks at module-eval time so the hero's above-the-fold
// v-gsap entrance animation doesn't flash before the directive's lazy
// loader fetches them on beforeMount.
if (import.meta.client) {
  void import('gsap')
  void import('gsap/ScrollTrigger')
}

definePageMeta({
  layout: false,
  colorMode: 'light',
})

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL

const jobsEmail = 'jobs@3ook.com'

const cultureValues = [
  { key: 'ai_native', icon: 'i-material-symbols-smart-toy-outline-rounded' },
  { key: 'lean', icon: 'i-material-symbols-bolt-rounded' },
  { key: 'reader_first', icon: 'i-material-symbols-auto-stories-rounded' },
]

const hiringAreas = [
  { key: 'automation', icon: 'i-material-symbols-settings-suggest-rounded' },
  { key: 'bd', icon: 'i-material-symbols-handshake-rounded' },
  { key: 'growth', icon: 'i-material-symbols-trending-up-rounded' },
]

const openPositions = [
  { key: 'bd' },
  { key: 'automation' },
  { key: 'marketing' },
]

function getApplyMailto(jobKey: string) {
  const url = new URL(`mailto:${jobsEmail}`)
  url.searchParams.set('subject', $t('careers_page_apply_subject', { title: $t(`careers_page_job_${jobKey}_title`) }))
  return url.toString()
}

function onClickHeroCta() {
  useLogEvent('careers_hero_cta_click')
}

function onClickAboutLink() {
  useLogEvent('careers_about_link_click')
}

function onClickPublishLink() {
  useLogEvent('careers_publish_link_click')
}

function onClickApply(jobKey: string) {
  useLogEvent('careers_apply_click', { job: jobKey })
}

function onClickOpenApplication() {
  useLogEvent('careers_open_application_click')
}

const pageTitle = computed(() => $t('careers_page_title'))
const pageDescription = computed(() => $t('careers_page_description'))
const canonicalURL = computed(() => `${baseURL}/careers`)

useHead(() => ({
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
}))
</script>
