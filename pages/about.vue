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
        @click="onClickHeroLogo"
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

      <div class="flex flex-row flex-wrap gap-4 justify-center">
        <UButton
          :to="localeRoute({ name: 'store' })"
          :label="$t('about_page_hero_cta_store')"
          color="primary"
          size="xl"
          icon="i-material-symbols-storefront"
          @click="onClickHeroCtaStore"
        />
        <UButton
          :to="isLikerPlus ? localeRoute({ name: 'shelf' }) : localeRoute({ name: 'member', query: { samples: '1' } })"
          :label="$t('about_page_hero_cta_narration')"
          variant="outline"
          class="text-inverted ring-inverted hover:bg-white/10"
          size="xl"
          icon="i-material-symbols-volume-up-rounded"
          @click="onClickHeroCtaNarration"
        />
      </div>
    </section>

    <!-- Stats Bar -->
    <section class="w-full bg-gray-50 border-y border-gray-200 py-8">
      <div
        v-gsap.whenVisible.once.stagger.from="{ y: 20, opacity: 0, duration: 0.4, stagger: 0.1 }"
        class="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 md:gap-16 px-4"
      >
        <div class="text-center">
          <p class="text-3xl font-bold text-primary">
            1,000+
          </p>
          <p
            class="text-sm text-muted"
            v-text="$t('about_page_stat_books')"
          />
        </div>
        <div class="text-center">
          <p class="text-3xl font-bold text-primary">
            10,000+
          </p>
          <p
            class="text-sm text-muted"
            v-text="$t('about_page_stat_readers')"
          />
        </div>
        <div class="text-center">
          <p class="text-3xl font-bold text-primary">
            90%*
          </p>
          <p
            class="text-sm text-muted"
            v-text="$t('about_page_stat_author_revenue')"
          />
        </div>
      </div>
    </section>

    <div class="w-full max-w-4xl mx-auto px-4 pt-12 py-16 space-y-12">
      <p
        class="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto text-center"
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
                  @click="onClickFeatureAiNarration"
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
                  to="https://docs.3ook.com/zh-TW/articles/11905421-成為-3ook-plus-會員後-如何使用朗讀功能"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                  @click="onClickFeatureDualFormat"
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
                name="i-material-symbols-storefront"
                size="24"
                class="text-primary"
              />
              <h3 class="text-xl font-semibold text-gray-900">
                <NuxtLink
                  :to="localeRoute({ name: 'store' })"
                  class="hover:text-primary hover:underline"
                  @click="onClickFeatureWeb3"
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
                  to="https://docs.3ook.com/zh-TW/articles/12750024-如何將-likecoin-質押-應援作品並獲取收益"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                  @click="onClickFeatureCurateToEarn"
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
                  to="https://docs.3ook.com/zh-TW/articles/12507238-如何在-3ook-com-出版電子書"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                  @click="onClickFeatureAuthorBenefits"
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
                  to="https://docs.3ook.com/zh-TW/articles/13515071-%E5%A6%82%E4%BD%95%E5%8A%A0%E5%85%A5-3ook-com-%E6%9B%B8%E5%BA%97%E6%8E%A8%E5%BB%A3%E8%A8%88%E5%8A%83"
                  target="_blank"
                  rel="noopener"
                  class="hover:text-primary hover:underline"
                  @click="onClickFeatureAffiliate"
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
          <p class="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            {{ $t('about_page_author_stories_content') }}
          </p>
        </div>

        <UCard
          class="overflow-hidden"
          :ui="{ body: 'space-y-4' }"
        >
          <div class="flex items-center gap-3">
            <UAvatar
              :src="getAvatarSrc('nghengsun')"
              :alt="$t('about_page_author_dung_kai_cheung')"
              icon="i-material-symbols-person-rounded"
              size="md"
            />
            <h3 class="text-xl font-bold text-gray-900">
              <UButton
                :to="getEntityStoreRoute('董啟章', 'author', 'nghengsun')"
                variant="link"
                :label="$t('about_page_author_dung_kai_cheung')"
                @click="onClickAuthorDungKaiCheung"
              />
            </h3>
          </div>
          <p class="text-muted leading-relaxed">
            {{ $t('about_page_author_dung_kai_cheung_desc') }}
          </p>

          <div
            class="aspect-video w-full rounded-xl overflow-hidden bg-gray-900 shadow-inner"
            @click.once="onPlayAuthorDungKaiCheungVideo"
          >
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
                :src="getAvatarSrc('ckxpress')"
                :alt="$t('about_page_author_kin_ko')"
                icon="i-material-symbols-person-rounded"
                size="md"
              />
              <h3 class="text-xl font-bold text-gray-900">
                <UButton
                  :to="getEntityStoreRoute('高重建', 'author', 'ckxpress')"
                  variant="link"
                  :label="$t('about_page_author_kin_ko')"
                  @click="onClickAuthorKinKo"
                />
              </h3>
            </div>
            <p class="text-muted leading-relaxed">
              {{ $t('about_page_author_kin_ko_desc') }}
            </p>

            <div
              class="w-[180px] aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-inner mx-auto mt-auto"
              @click.once="onPlayAuthorKinKoVideo"
            >
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
                  @click="onClickAuthorFuYueAn"
                />
              </h3>
            </div>
            <p class="text-muted leading-relaxed">
              {{ $t('about_page_author_fu_yue_an_desc') }}
            </p>

            <div
              class="w-[180px] aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 shadow-inner mx-auto mt-auto"
              @click.once="onPlayAuthorFuYueAnVideo"
            >
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

      <!-- Featured Publishers & Media Section -->
      <section
        id="featured-publishers"
        class="space-y-6"
      >
        <div class="text-center space-y-2">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ $t('about_page_featured_publishers_title') }}
          </h2>
          <p class="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            {{ $t('about_page_featured_publishers_content') }}
          </p>
        </div>

        <div
          v-gsap.whenVisible.once.stagger.from="{ y: 20, opacity: 0, duration: 0.4, stagger: 0.05 }"
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6"
        >
          <NuxtLink
            v-for="publisher in featuredPublishers"
            :key="publisher.likerId"
            :to="getEntityStoreRoute(publisher.name, 'publisher', publisher.likerId)"
            class="flex flex-col items-center gap-2 group"
            @click="onClickFeaturedPublisher"
          >
            <UAvatar
              :src="getAvatarSrc(publisher.likerId)"
              :alt="publisher.name"
              icon="i-material-symbols-person-2-rounded"
              size="xl"
              class="transition-transform group-hover:scale-110"
            />
            <span class="text-sm text-center text-gray-700 group-hover:text-primary transition-colors">
              {{ publisher.name }}
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <!-- 3ook Plus Membership Section -->
    <section
      id="plus"
      class="w-full bg-gradient-to-r from-primary/10 to-secondary/20 py-12 px-4"
    >
      <div class="max-w-4xl mx-auto text-center space-y-6">
        <h2
          class="text-2xl md:text-3xl font-bold text-gray-900"
          v-text="$t('about_page_plus_title')"
        />
        <p
          class="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto"
          v-text="$t('about_page_plus_description')"
        />
        <div
          v-gsap.whenVisible.once.stagger.from="{ y: 30, opacity: 0, duration: 0.4, stagger: 0.1 }"
          class="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-3xl mx-auto"
        >
          <div class="flex items-start gap-2">
            <UIcon
              name="i-material-symbols-volume-up-rounded"
              size="20"
              class="text-primary mt-0.5 shrink-0"
            />
            <span
              class="text-sm text-gray-700"
              v-text="$t('about_page_plus_feature_tts')"
            />
          </div>
          <div class="flex items-start gap-2">
            <UIcon
              name="i-material-symbols-discount-rounded"
              size="20"
              class="text-primary mt-0.5 shrink-0"
            />
            <span
              class="text-sm text-gray-700"
              v-text="$t('about_page_plus_feature_discount')"
            />
          </div>
          <div class="flex items-start gap-2">
            <UIcon
              name="i-material-symbols-new-releases-rounded"
              size="20"
              class="text-primary mt-0.5 shrink-0"
            />
            <span
              class="text-sm text-gray-700"
              v-text="$t('about_page_plus_feature_early_access')"
            />
          </div>
          <div class="flex items-start gap-2">
            <UIcon
              name="i-material-symbols-support-agent-rounded"
              size="20"
              class="text-primary mt-0.5 shrink-0"
            />
            <span
              class="text-sm text-gray-700"
              v-text="$t('about_page_plus_feature_support')"
            />
          </div>
        </div>
        <UButton
          :to="localeRoute({ name: 'member' })"
          :label="$t('about_page_plus_cta')"
          color="primary"
          size="lg"
          icon="i-material-symbols-star-rounded"
          @click="onClickPlusCta"
        />
      </div>
    </section>

    <div class="w-full max-w-4xl mx-auto px-4 py-12 space-y-12">
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
          class="text-lg text-muted max-w-2xl mx-auto"
          v-text="$t('about_page_contact_content')"
        />
        <div class="flex flex-row flex-wrap gap-4 justify-center">
          <LoginButton @click="onClickCtaSignUp" />
          <UButton
            :to="localeRoute({ name: 'store' })"
            :label="$t('app_header_store')"
            color="primary"
            size="lg"
            icon="i-material-symbols-storefront"
            @click="onClickCtaStore"
          />
        </div>
      </UCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  colorMode: 'light',
})

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()
const config = useRuntimeConfig()
const baseURL = config.public.baseURL
const { user } = useUserSession()
const isLikerPlus = computed(() => Boolean(user.value?.isLikerPlus))

const metadataStore = useMetadataStore()

const featuredPublishers = [
  { name: '突破出版', likerId: 'breakthrough_publish' },
  { name: '風簷出版', likerId: '0xpioneer' },
  { name: '飛地出版', likerId: 'nowherebooks' },
  { name: '端點出版', likerId: 'terminus2046' },
  { name: '本土研究社', likerId: 'liber-research' },
  { name: '藍藍的天', likerId: 'bbluesky' },
  { name: '留下書舍', likerId: 'hansbookstore' },
  { name: '早安財經文化', likerId: 'goodmorningpress' },
  { name: '壹壹陸工作室', likerId: '116workshop' },
  { name: '蜂鳥出版', likerId: 'ywxctc' },
  { name: '董富記', likerId: 'nghengsun' },
  { name: '好青年荼毒室', likerId: 'corrupttheyouth' },
  { name: '界限書店', likerId: 'boundarybooks' },
  { name: '字字研究所', likerId: 'wordbyword' },
  { name: '筆求人工作室', likerId: 'penseeker' },
  { name: '集誌社', likerId: 'thecollectivehk' },
  { name: 'Kubrick', likerId: 'kubrick_hk' },
  { name: 'dirty press', likerId: 'kcyguj' },
]

function getAvatarSrc(likerId: string) {
  return metadataStore.getLikerInfoById(likerId)?.avatarSrc
}

function getEntityStoreRoute(name: string, fallbackType: 'author' | 'publisher', likerId?: string) {
  if (likerId) {
    const wallet = metadataStore.getLikerInfoById(likerId)?.evmWallet
    if (wallet) return localeRoute({ name: 'store', query: { owner_wallet: wallet } })
  }
  return localeRoute({ name: 'store', query: { [fallbackType]: name } })
}

onMounted(async () => {
  const likerIds = [
    'nghengsun',
    'ckxpress',
    ...featuredPublishers.map(p => p.likerId),
  ]
  const uniqueLikerIds = [...new Set(likerIds)]
  await Promise.allSettled(uniqueLikerIds.map(id => metadataStore.lazyFetchLikerInfoById(id)))
})

function onClickFeaturedPublisher() {
  useLogEvent('about_featured_publisher_click')
}

function onClickHeroLogo() {
  useLogEvent('about_hero_logo_click')
}

function onClickHeroCtaStore() {
  useLogEvent('about_hero_cta_store_click')
}

function onClickHeroCtaNarration() {
  useLogEvent('about_hero_cta_narration_click')
}

function onClickFeatureAiNarration() {
  useLogEvent('about_feature_ai_narration_click')
}

function onClickFeatureDualFormat() {
  useLogEvent('about_feature_dual_format_click')
}

function onClickFeatureWeb3() {
  useLogEvent('about_feature_web3_click')
}

function onClickFeatureCurateToEarn() {
  useLogEvent('about_feature_curate_to_earn_click')
}

function onClickFeatureAuthorBenefits() {
  useLogEvent('about_feature_author_benefits_click')
}

function onClickFeatureAffiliate() {
  useLogEvent('about_feature_affiliate_click')
}

function onClickAuthorDungKaiCheung() {
  useLogEvent('about_author_dung_kai_cheung_click')
}

function onPlayAuthorDungKaiCheungVideo() {
  useLogEvent('about_author_dung_kai_cheung_video_play')
}

function onClickAuthorKinKo() {
  useLogEvent('about_author_kin_ko_click')
}

function onPlayAuthorKinKoVideo() {
  useLogEvent('about_author_kin_ko_video_play')
}

function onClickAuthorFuYueAn() {
  useLogEvent('about_author_fu_yue_an_click')
}

function onPlayAuthorFuYueAnVideo() {
  useLogEvent('about_author_fu_yue_an_video_play')
}

function onClickCtaSignUp() {
  useLogEvent('about_cta_sign_up_click')
}

function onClickCtaStore() {
  useLogEvent('about_cta_store_click')
}

function onClickPlusCta() {
  useLogEvent('about_plus_cta_click')
}

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
    { property: 'og:video', content: 'https://www.youtube.com/embed/BibwtPyXxCg' },
    { property: 'og:video:type', content: 'text/html' },
    { property: 'og:video:width', content: '1280' },
    { property: 'og:video:height', content: '720' },
  ],
  link: [
    { rel: 'canonical', href: canonicalURL.value },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        'name': pageTitle.value,
        'description': pageDescription.value,
        'url': canonicalURL.value,
        'mainEntity': {
          '@type': 'Organization',
          'name': '3ook.com',
          'url': baseURL,
          'logo': `${baseURL}/images/og/default.jpg`,
        },
        'video': [
          {
            '@type': 'VideoObject',
            'name': $t('about_page_author_dung_kai_cheung'),
            'description': $t('about_page_author_dung_kai_cheung_desc'),
            'thumbnailUrl': 'https://img.youtube.com/vi/BibwtPyXxCg/maxresdefault.jpg',
            'contentUrl': 'https://www.youtube.com/watch?v=BibwtPyXxCg',
            'embedUrl': 'https://www.youtube.com/embed/BibwtPyXxCg',
          },
          {
            '@type': 'VideoObject',
            'name': $t('about_page_author_kin_ko'),
            'description': $t('about_page_author_kin_ko_desc'),
            'thumbnailUrl': 'https://img.youtube.com/vi/llHnvvDyzns/maxresdefault.jpg',
            'contentUrl': 'https://www.youtube.com/watch?v=llHnvvDyzns',
            'embedUrl': 'https://www.youtube.com/embed/llHnvvDyzns',
          },
          {
            '@type': 'VideoObject',
            'name': $t('about_page_author_fu_yue_an'),
            'description': $t('about_page_author_fu_yue_an_desc'),
            'thumbnailUrl': 'https://img.youtube.com/vi/3nsPGnqdoIk/maxresdefault.jpg',
            'contentUrl': 'https://www.youtube.com/watch?v=3nsPGnqdoIk',
            'embedUrl': 'https://www.youtube.com/embed/3nsPGnqdoIk',
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.logo-glow {
  animation: rotate-glow 8s linear infinite, pulse-glow 3s ease-in-out infinite;
}
</style>
