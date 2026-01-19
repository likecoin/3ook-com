<template>
  <NuxtLayout
    name="default"
    :is-footer-visible="true"
  >
    <!-- Hero Section with Banner -->
    <section
      id="hero"
      class="flex flex-col justify-center items-center text-center space-y-16 min-h-[70vh] px-8 py-20 bg-theme-black bg-center"
    >
      <NuxtLink
        :to="localeRoute({ name: 'store' })"
        class="w-full max-w-lg"
      >
        <div class="relative flex justify-center items-center">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div class="logo-glow rounded-full blur-3xl" />
          </div>
          <AppLogo
            height="auto"
            :is-icon="false"
            :is-padded="false"
            class="relative"
          />
        </div>
      </NuxtLink>

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
        id="what-is"
        class="text-2xl md:text-3xl text-center font-bold text-gray-900 mb-4"
        v-text="$t('about_page_what_is_title')"
      />
      <p
        class="text-lg text-gray-700 leading-relaxed"
        v-text="$t('about_page_what_is_content')"
      />

      <!-- Key Features Section -->
      <section
        id="features"
        class="space-y-6"
      >
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900 text-center"
          v-text="$t('about_page_features_title')"
        />

        <div
          v-gsap.whenVisible.once.stagger.from="{ y: 50, opacity: 0, duration: 0.6, stagger: 0.1 }"
          class="grid md:grid-cols-2 gap-6"
        >
          <UCard
            id="ai-narration"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-volume-up-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="localeRoute({ name: 'member' })"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_ai_narration') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_ai_narration_desc')"
            />
          </UCard>

          <UCard
            id="dual-format"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-auto-stories-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="localeRoute({ name: 'shelf' })"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_dual_format') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_dual_format_desc')"
            />
          </UCard>

          <UCard
            id="web3"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-store-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="localeRoute({ name: 'store' })"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_web3') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_web3_desc')"
            />
          </UCard>

          <UCard
            id="curate-to-earn"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-pie-chart"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  to="https://3ook.com/store/0x3ddc416c403449bc2a9ae873bff0b687993cd662#staking-info"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_curate_to_earn') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_curate_to_earn_desc')"
            />
          </UCard>

          <UCard
            id="author-benefits"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-handshake-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="publishURL"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_author_benefits') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_author_benefits_desc')"
            />
          </UCard>

          <UCard
            id="affiliate"
            class="p-6 space-y-3"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-material-symbols-trending-up-rounded"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="affiliateURL"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                >
                  {{ $t('about_page_feature_affiliate') }}
                </NuxtLink>
              </h3>
            </div>
            <p
              class="mt-4 text-gray-700"
              v-text="$t('about_page_feature_affiliate_desc')"
            />
          </UCard>
        </div>
      </section>

      <section
        id="author-stories"
        class="space-y-12"
      >
        <div class="text-center space-y-4">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ $t('about_page_author_stories_title') }}
          </h2>
          <p class="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {{ $t('about_page_author_stories_content') }}
          </p>
        </div>

        <UCard
          class="overflow-hidden"
          :ui="{ body: 'space-y-4' }"
        >
          <div class="flex items-center gap-3">
            <UAvatar
              icon="i-material-symbols-person-rounded"
              size="md"
            />
            <h3 class="text-xl font-bold text-gray-900">
              <UButton
                :to="localeRoute({ name: 'store', query: { author: '董啟章' } })"
                variant="link"
                :label="$t('about_page_author_dung_kai_cheung')"
              />
            </h3>
          </div>
          <p class="text-gray-600 leading-relaxed">
            {{ $t('about_page_author_dung_kai_cheung_desc') }}
          </p>

          <div class="aspect-video w-full rounded-xl overflow-hidden bg-gray-900 shadow-inner">
            <ClientOnly>
              <ScriptYouTubePlayer
                video-id="BibwtPyXxCg"
                :width="16"
                :height="9"
                :aria-label="$t('about_page_author_dung_kai_cheung')"
                :title="$t('about_page_author_dung_kai_cheung')"
              >
                <template #placeholder>
                  <img
                    src="~/assets/images/about/dung_preview.png"
                    :alt="$t('about_page_author_dung_kai_cheung')"
                    class="w-full h-full object-cover"
                  >
                </template>
              </ScriptYouTubePlayer>
            </ClientOnly>
          </div>
        </UCard>

        <div class="grid md:grid-cols-2 gap-6 items-stretch">
          <UCard
            class="overflow-hidden h-full"
            :ui="{ body: 'flex flex-col gap-4 h-full' }"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                icon="i-material-symbols-person-rounded"
                size="md"
              />
              <h3 class="text-xl font-bold text-gray-900">
                <UButton
                  :to="localeRoute({ name: 'store', query: { author: '高重建' } })"
                  variant="link"
                  :label="$t('about_page_author_kin_ko')"
                />
              </h3>
            </div>
            <p class="text-gray-600 leading-relaxed">
              {{ $t('about_page_author_kin_ko_desc') }}
            </p>

            <div class="w-[180px] aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-inner mx-auto mt-auto">
              <ClientOnly>
                <ScriptYouTubePlayer
                  video-id="llHnvvDyzns"
                  :width="9"
                  :height="16"
                  :aria-label="$t('about_page_author_kin_ko')"
                  :title="$t('about_page_author_kin_ko')"
                >
                  <template #placeholder>
                    <img
                      src="~/assets/images/about/kin_preview.png"
                      :alt="$t('about_page_author_kin_ko')"
                      class="w-full h-full object-cover"
                    >
                  </template>
                </ScriptYouTubePlayer>
              </ClientOnly>
            </div>
          </UCard>

          <UCard
            class="overflow-hidden h-full"
            :ui="{ body: 'flex flex-col gap-4 h-full' }"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                icon="i-material-symbols-person-rounded"
                size="md"
              />
              <h3 class="text-xl font-bold text-gray-900">
                <UButton
                  :to="localeRoute({ name: 'store', query: { author: '傅月庵' } })"
                  variant="link"
                  :label="$t('about_page_author_fu_yue_an')"
                />
              </h3>
            </div>
            <p class="text-gray-600 leading-relaxed">
              {{ $t('about_page_author_fu_yue_an_desc') }}
            </p>

            <div class="w-[180px] aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-inner mx-auto mt-auto">
              <ClientOnly>
                <ScriptYouTubePlayer
                  video-id="3nsPGnqdoIk"
                  :width="9"
                  :height="16"
                  :aria-label="$t('about_page_author_fu_yue_an')"
                  :title="$t('about_page_author_fu_yue_an')"
                >
                  <template #placeholder>
                    <img
                      src="~/assets/images/about/fu_preview.png"
                      :alt="$t('about_page_author_fu_yue_an')"
                      class="w-full h-full object-cover"
                    >
                  </template>
                </ScriptYouTubePlayer>
              </ClientOnly>
            </div>
          </UCard>
        </div>
      </section>
    </div>

    <!-- Mission Section -->
    <div
      id="mission"
      class="p-8 py-12 bg-gradient-to-r from-primary/10 to-secondary/20"
    >
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
      <section id="team">
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
      <section id="platform">
        <h2
          class="text-2xl md:text-3xl text-center font-bold text-gray-900 mb-4"
          v-text="$t('about_page_platform_title')"
        />
        <i18n-t
          keypath="about_page_platform_evolution"
          tag="p"
          class="text-lg text-gray-700 text-center leading-relaxed"
        >
          <template #likecoin_v3>
            <a
              href="https://like.co"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline font-medium"
            >LikeCoin v3</a>
          </template>
        </i18n-t>
      </section>

      <!-- Get Started Section -->
      <UCard
        id="contact"
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
definePageMeta({ layout: false })

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL
const isTestnet = !!config.public.isTestnet

const publishURL = computed(() => isTestnet ? 'https://publish.sepolia.3ook.com' : 'https://publish.3ook.com')
const affiliateURL = computed(() => `${publishURL.value}/sales-report`)

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

<style scoped>
.logo-glow {
  animation: rotate-glow 8s linear infinite, pulse-glow 3s ease-in-out infinite;
}
</style>
