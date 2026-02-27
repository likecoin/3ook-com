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
          v-if="!isApp"
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

    <div class="w-full max-w-4xl mx-auto px-4 pt-12 py-16 space-y-20">
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
              <h3
                v-if="isApp"
                class="text-xl font-semibold text-gray-900"
                v-text="$t('about_page_feature_ai_narration')"
              />
              <h3
                v-else
                class="text-xl font-semibold text-gray-900"
              >
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
                :cookies="true"
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
                  :cookies="true"
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
                  :cookies="true"
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

      <!-- Featured Authors Section -->
      <section
        id="featured-authors"
        class="space-y-6"
      >
        <div class="text-center space-y-2">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ $t('about_page_featured_authors_title') }}
          </h2>
          <p class="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            {{ $t('about_page_featured_authors_content') }}
          </p>
        </div>

        <div
          v-gsap.whenVisible.once.stagger.from="{ y: 20, opacity: 0, duration: 0.4, stagger: 0.05 }"
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6"
        >
          <NuxtLink
            v-for="author in featuredAuthors"
            :key="author.name"
            :to="getEntityStoreRoute(author.name, 'author', author.likerId)"
            class="flex flex-col items-center gap-2 group"
            @click="onClickFeaturedAuthor"
          >
            <UAvatar
              :src="author.avatar || (author.likerId ? getAvatarSrc(author.likerId) : undefined)"
              :alt="author.name"
              icon="i-material-symbols-person-2-rounded"
              size="xl"
              class="transition-transform group-hover:scale-110"
            />
            <span class="text-sm text-center text-gray-700 group-hover:text-primary transition-colors">
              {{ author.name }}
            </span>
          </NuxtLink>
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

      <!-- Media Coverage Section -->
      <section
        id="media-coverage"
        class="space-y-6"
      >
        <div class="text-center space-y-2">
          <h2 class="text-2xl md:text-3xl font-bold text-gray-900">
            {{ $t('about_page_media_coverage_title') }}
          </h2>
          <p class="text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            {{ $t('about_page_media_coverage_content') }}
          </p>
        </div>

        <div class="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          <NuxtLink
            v-for="item in mediaCoverage"
            :key="item.url"
            :to="item.url"
            :title="item.title"
            target="_blank"
            rel="noopener"
            class="opacity-70 hover:opacity-100 transition-opacity"
            @click="onClickMediaCoverage"
          >
            <img
              v-if="item.logo"
              :src="item.logo"
              :alt="item.source"
              class="h-8 md:h-10 w-auto object-contain"
            >
            <span
              v-else
              class="text-lg md:text-xl font-bold text-gray-800 whitespace-nowrap"
            >
              {{ item.source }}
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
              name="i-material-symbols-percent-discount-outline-rounded"
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
              name="i-material-symbols-dark-mode-outline-rounded"
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
          v-if="!isApp"
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
import shoppingDesignLogo from '~/assets/images/about/media/shopping-design.png'
import trensseLogo from '~/assets/images/about/media/trensse.png'
import glassesOnLogo from '~/assets/images/about/media/glasses-on.png'
import scmpLogo from '~/assets/images/about/media/scmp.png'
import unwireLogo from '~/assets/images/about/media/unwire.png'

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
const { isApp } = useAppDetection()

const authorAvatars = import.meta.glob<{ default: string }>('~/assets/images/about/avatars/*.png', { eager: true })
function getLocalAvatar(filename: string) {
  const key = Object.keys(authorAvatars).find(k => k.endsWith(`/${filename}`))
  return key ? authorAvatars[key]!.default : undefined
}

const featuredAuthors = [
  { name: '高重建', likerId: 'ckxpress' },
  { name: 'H醫生', avatar: getLocalAvatar('dr-h.png') },
  { name: '胡境陽', likerId: 'lakeviewsun' },
  { name: '董啟章', likerId: 'nghengsun' },
  { name: '邵家臻', avatar: getLocalAvatar('shiu-ka-chun.png') },
  { name: 'Pazu 薯伯伯', avatar: getLocalAvatar('pazu.png') },
  { name: '譚蕙芸', avatar: getLocalAvatar('tam-wai-wan.png') },
  { name: '畢明', avatar: getLocalAvatar('budming.png') },
  { name: '陳滅', likerId: 'chanmit', avatar: getLocalAvatar('chan-mit.png') },
  { name: '法庭線', likerId: 'thewitness' },
  { name: '庭刊', likerId: 'hkcourtnews2023' },
  { name: 'Wave流行文化誌', avatar: getLocalAvatar('wave-zinehk.png') },
  { name: '吳靄儀', avatar: getLocalAvatar('margaret-ng.png') },
  { name: '徐賁', avatar: getLocalAvatar('xu-ben.png') },
  { name: 'Ms Yu' },
  { name: '馬菲', avatar: getLocalAvatar('ma-fei.png') },
  { name: '馬傑偉', avatar: getLocalAvatar('ma-kit-wai.png') },
  { name: '蔣曉薇', avatar: getLocalAvatar('cheung-hiu-mei.png') },
  { name: '游欣妮', avatar: getLocalAvatar('yau-yan-nei.png') },
  { name: '梁柏堅', avatar: getLocalAvatar('leung-pak-kin.png') },
  { name: '傅月庵', avatar: getLocalAvatar('fu-yue-an.png') },
  { name: '蔡錦源', avatar: getLocalAvatar('tsoi-kam-yuen.png') },
  { name: '亞然', avatar: getLocalAvatar('tommy-kwan.png') },
]

const mediaCoverage = [
  {
    title: '當人人都能為好書代言：3ook.com 打造正向閱讀迴圈',
    source: 'Shopping Design',
    url: 'https://www.shoppingdesign.com.tw/post/view/13140',
    logo: shoppingDesignLogo,
  },
  {
    title: '演算法決定不了的浪漫：拒絕被標準化的一本書，與一場名為 3ook.com 的出版實驗',
    source: 'TRENSSE',
    url: 'https://www.trensse.com/2026/02/26/3ook/',
    logo: trensseLogo,
  },
  {
    title: '3ook.com 分散式出版 — Web3 金融外的應用場景',
    source: '借鏡集 Glasses On',
    url: 'https://www.youtube.com/watch?v=DzQqXHEU-Bo',
    logo: glassesOnLogo,
  },
  {
    title: 'GenAI Pioneers Tackle Hong Kong\'s Challenges at the First AWS AI Hackathon',
    source: 'South China Morning Post',
    url: 'https://www.scmp.com/presented/tech/topics/generative-ai-and-cloud-services/article/3330885/genai-pioneers-tackle-hong-kongs-challenges-first-aws-ai-hackathon',
    logo: scmpLogo,
  },
  {
    title: 'GenAI 創新力量　AWS AI Hackathon 三大香港實戰方案出爐',
    source: 'unwire.hk',
    url: 'https://unwire.hk/2025/10/31/aws-ai-hackathon-2/genai-and-cloud',
    logo: unwireLogo,
  },
]

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
    ...featuredAuthors.filter(a => a.likerId).map(a => a.likerId!),
    ...featuredPublishers.map(p => p.likerId),
  ]
  const uniqueLikerIds = [...new Set(likerIds)]
  await Promise.allSettled(uniqueLikerIds.map(id => metadataStore.lazyFetchLikerInfoById(id)))
})

function onClickFeaturedAuthor() {
  useLogEvent('about_featured_author_click')
}

function onClickFeaturedPublisher() {
  useLogEvent('about_featured_publisher_click')
}

function onClickMediaCoverage() {
  useLogEvent('about_media_coverage_click')
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
