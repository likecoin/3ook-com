<template>
  <div class="flex w-full flex-col justify-center">
    <section class="hk-local-histories-hero w-full min-h-screen flex justify-center relative text-white px-12 py-24 laptop:py-36">
      <UButton
        class="absolute z-10 top-4 left-4"
        icon="i-material-symbols-arrow-back-rounded"
        :to="localeRoute({ name: 'local-histories' })"
        variant="ghost"
        color="neutral"
        size="md"
        :aria-label="$t('common_back')"
        :ui="{ base: 'text-white hover:bg-white/10' }"
      />
      <div class="z-10 flex flex-col text-center max-w-6xl mx-auto px-2 laptop:px-12">
        <div class="absolute bottom-[60px] left-1/2 transform -translate-x-1/2 w-full max-w-2xl text-white">
          <div class="flex justify-center mb-6">
            <LocalHistoriesScrollIndicator class="mx-auto" />
          </div>
          <h1
            class="text-4xl laptop:text-6xl font-bold mb-6"
            v-text="$t('hk_local_histories_hero_title')"
          />

          <p
            class="text-lg laptop:text-xl text-white/90 mb-8 max-w-2xl"
            v-text="$t('hk_local_histories_hero_description')"
          />
        </div>
      </div>
    </section>
    <section class="w-full bg-white">
      <div class="mx-auto w-full max-w-6xl px-4 py-12 laptop:p-24 laptop:pt-18">
        <div
          ref="heroStatsRef"
          class="grid grid-cols-3 gap-4 text-center mb-20"
        >
          <div
            v-for="(stat, index) in heroStats"
            :key="stat.label"
            class="flex flex-col items-center gap-1"
          >
            <span
              class="text-2xl laptop:text-3xl font-semibold"
              v-text="animatedStats[index]"
            />
            <span
              class="text-sm text-black"
              v-text="stat.label"
            />
          </div>
        </div>
        <div class="flex flex-col gap-4 text-[#2a1f1a]">
          <p
            class="text-sm font-semibold uppercase tracking-wider text-[#8a6f5f]"
            v-text="$t('hk_local_histories_about_kicker')"
          />
          <h2
            class="text-2xl laptop:text-3xl font-semibold"
            v-text="$t('hk_local_histories_about_title')"
          />
          <div class="space-y-4 text-base leading-relaxed text-[#5a4a3f]">
            <p v-text="$t('hk_local_histories_about_paragraph_1')" />
            <p v-text="$t('hk_local_histories_about_paragraph_2')" />
            <p v-text="$t('hk_local_histories_about_paragraph_3')" />
          </div>
        </div>
      </div>
    </section>
    <div class="mx-auto w-full max-w-6xl px-4 py-12">
      <header class="mb-8 laptop:mb-12">
        <h2
          class="text-2xl text-center font-semibold text-neutral-900"
          v-text="$t('hk_local_histories_overview_title')"
        />
        <p
          class="mt-2 text-sm text-center text-neutral-600"
          v-text="$t('hk_local_histories_overview_description')"
        />
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section class="hidden bg-transparent lg:block">
          <HKLocalHistoriesMap
            :active-area="activeArea"
            :selected-area="selectedArea"
            :aria-label="t('hk_local_histories_map_aria_label')"
            @area-hover="handleMapHover"
            @area-click="handleMapClick"
          />
        </section>

        <section class="flex flex-col gap-4">
          <div
            v-for="region in regions"
            :key="region.key"
            class="relative cursor-pointer rounded-2xl bg-[#f6f0e8] p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
            :class="selectedArea === region.key ? 'ring-2 ring-[#a08070] shadow-md' : 'hover:ring-1 hover:ring-[#d8cfc2]'"
            role="button"
            tabindex="0"
            @click="handleCardClick(region.key)"
            @keydown.enter="handleCardClick(region.key)"
            @keydown.space.prevent="handleCardClick(region.key)"
          >
            <div
              class="pointer-events-none absolute inset-0 rounded-2xl bg-cover bg-center opacity-30"
              :style="{ backgroundImage: `url(${regionImages[region.key]})` }"
            />
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-base font-semibold text-[#4a2f1a]">
                <span v-text="region.name" />
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full bg-[#e8ddd2] px-3 py-1 text-xs font-medium text-[#5a4a3f]"
                  v-text="$t('hk_local_histories_unit_count', { count: featuredByRegion[region.key]?.length ?? 0 })"
                />
                <UIcon
                  name="i-material-symbols-expand-more-rounded"
                  class="text-lg text-[#a08a78] transition-transform duration-200"
                  :class="selectedArea === region.key ? 'rotate-180' : ''"
                />
              </div>
            </div>
            <p
              class="mt-3 text-sm text-[#6f5f4f]"
              v-text="region.areas.join('、')"
            />
            <div
              v-if="selectedArea === region.key"
              class="mt-4 border-t border-[#d8cfc2] pt-3"
            >
              <ul class="mt-2 grid gap-2 text-sm text-[#6f5f4f]">
                <li
                  v-for="item in featuredByRegion[region.key] ?? []"
                  :key="item.title"
                  class="flex items-center gap-2 min-w-0"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-[#a08a78]" />
                  <NuxtLink
                    v-if="item.isPublished"
                    :to="localeRoute(getStoreQueryRoute(item.title))"
                    class="whitespace-nowrap text-[#4a2f1a] hover:text-[#2a1f1a]"
                    @click.stop
                  >{{ item.title }}</NuxtLink>
                  <span
                    v-else
                    class="whitespace-nowrap text-[#b0a89b]"
                    v-text="item.title"
                  />

                  <span
                    class="min-w-0 flex-1 truncate text-xs text-[#b0a89b]"
                    v-text="`— ${item.summary}`"
                  />
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-20 min-h-[800px] px-6 py-8 text-[#2a2a4a]">
        <header class="mb-6">
          <div class="text-center">
            <h2
              class="text-2xl text-center font-semibold text-neutral-900"
              v-text="$t('hk_local_histories_featured_title')"
            />
            <p
              class="mt-1 text-sm text-neutral-900"
              v-text="$t('hk_local_histories_featured_description')"
            />
          </div>
        </header>

        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in featuredTags"
              :key="tag"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition"
              :class="activeKeyword === tag ? 'border-[#a08070] bg-[#a08070] text-[#fff5eb]' : 'border-[#4a4d5f] bg-transparent text-[#2f374a] hover:border-[#9ba2b5] hover:text-[#2f374a]'"
              @click="toggleKeyword(tag)"
              v-text="tag"
            />
          </div>
          <div class="w-full sm:max-w-xs">
            <label
              class="sr-only"
              for="featured-search"
              v-text="$t('hk_local_histories_featured_search_label')"
            />
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a08a78]">
                <UIcon name="i-material-symbols-search" />
              </span>
              <input
                id="featured-search"
                v-model="searchTerm"
                type="text"
                :placeholder="$t('hk_local_histories_featured_search_placeholder')"
                class="w-full rounded-full border border-[#d1c4b5] py-2 pl-10 pr-4 text-sm text-[#4a2f1a] shadow-sm focus:border-[#a08a78] focus:outline-none focus:ring-2 focus:ring-[#c9b9a9]"
              >
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <template
            v-for="item in filteredFeatured"
            :key="item.title"
          >
            <NuxtLink
              v-if="item.isPublished"
              :to="localeRoute(getStoreQueryRoute(item.title))"
              class="rounded-2xl border border-[#f5e8d8] bg-white p-4 shadow-sm transition hover:border-[#d4a87a]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e8d8] text-[#4a3628]">
                    <UIcon name="i-material-symbols-auto-stories-outline" />
                  </span>
                  <div>
                    <h3
                      class="text-base font-semibold text-neutral-900"
                      v-text="item.title"
                    />
                    <p
                      class="mt-1 text-xs text-neutral-500"
                      v-text="`${item.district} · ${item.region}`"
                    />
                  </div>
                </div>
              </div>
              <p
                class="mt-3 text-sm text-neutral-600"
                v-text="item.summary"
              />
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                  v-text="tag"
                />
              </div>
            </NuxtLink>
            <div
              v-else
              class="rounded-2xl border border-[#f5e8d8] bg-white p-4 opacity-60"
            >
              <div class="flex items-start gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e8d8] text-[#4a3628]">
                  <UIcon name="i-material-symbols-auto-stories-outline" />
                </span>
                <div>
                  <h3
                    class="text-base font-semibold text-neutral-900"
                    v-text="item.title"
                  />
                  <p
                    class="mt-1 text-xs text-neutral-500"
                    v-text="`${item.district} · ${item.region}`"
                  />
                </div>
              </div>
              <p
                class="mt-3 text-sm text-neutral-600"
                v-text="item.summary"
              />
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { featuredHKLocalHistories } from '~~/shared/constants/featured-hk-local-histories'

const localeRoute = useLocaleRoute()

definePageMeta({
  colorMode: 'light',
})

const hoveredArea = ref<string | null>(null)
const selectedArea = ref<string | null>('hk-island')

const activeArea = computed(() => selectedArea.value ?? hoveredArea.value)

const handleMapHover = (area: string | null) => {
  hoveredArea.value = area
}

const handleMapClick = (area: string) => {
  if (selectedArea.value === area) return
  selectedArea.value = area
}

const handleCardClick = (regionKey: string) => {
  selectedArea.value = selectedArea.value === regionKey ? null : regionKey
}

const REGION_NAME_TO_KEY: Record<string, string> = {
  港島: 'hk-island',
  九龍: 'kowloon',
  新界: 'new-territories',
  離島: 'islands',
}

const featuredByRegion = computed(() => {
  const map: Record<string, typeof featuredHKLocalHistories> = {}
  featuredHKLocalHistories.forEach((item) => {
    const key = REGION_NAME_TO_KEY[item.region]
    if (!key) return
    if (!map[key]) {
      map[key] = []
    }
    map[key]?.push(item)
  })
  return map
})

const searchTerm = ref('')
const debouncedSearchTerm = refDebounced(searchTerm, 300)
const activeKeyword = ref('全部')

const featuredTags = ['全部', '社區', '文化', '民生', '環境', '歷史']

const filteredFeatured = computed(() => {
  const keyword = activeKeyword.value
  const term = debouncedSearchTerm.value.trim().toLowerCase()

  return featuredHKLocalHistories.filter((item) => {
    const matchesKeyword = keyword === '全部' || item.tags.includes(keyword)
    if (!term) return matchesKeyword

    const text = `${item.title} ${item.district} ${item.region} ${item.summary} ${item.tags.join(' ')}`.toLowerCase()
    return matchesKeyword && text.includes(term)
  })
})

const toggleKeyword = (tag: string) => {
  activeKeyword.value = activeKeyword.value === tag ? '全部' : tag
}

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()

useHead({
  title: t('hk_local_histories_page_title'),
  meta: [
    { name: 'description', content: t('hk_local_histories_page_description') },
    { property: 'og:title', content: t('hk_local_histories_page_title') },
    { property: 'og:description', content: t('hk_local_histories_page_description') },
  ],
  link: [
    { rel: 'canonical', href: `${runtimeConfig.public.baseURL}${route.path}` },
  ],
})

const heroStatTargets = [91, 10, 13]

const heroStats = computed(() => [
  { label: t('hk_local_histories_hero_stat_issues') },
  { label: t('hk_local_histories_hero_stat_districts') },
  { label: t('hk_local_histories_hero_stat_publications') },
])

const heroStatsRef = ref<HTMLElement | null>(null)
const statsProgress = ref(0)
const transitionedProgress = useTransition(statsProgress, { duration: 700 })
const animatedStats = computed(() =>
  heroStatTargets.map(target => Math.round(target * transitionedProgress.value)),
)

const { stop: stopObserver } = useIntersectionObserver(
  heroStatsRef,
  ([entry]) => {
    if (entry?.isIntersecting) {
      statsProgress.value = 1
      stopObserver()
    }
  },
  { threshold: 0.4 },
)

const regions = [
  {
    key: 'hk-island',
    name: '港島',
    areas: ['中西區', '灣仔區', '東區', '南區'],
  },
  {
    key: 'kowloon',
    name: '九龍',
    areas: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'],
  },
  {
    key: 'new-territories',
    name: '新界',
    areas: ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區'],
  },
  {
    key: 'islands',
    name: '離島',
    areas: ['離島區'],
  },
]

const regionImages: Record<string, string> = {
  'hk-island': '/images/hk-hk-island.svg',
  'kowloon': '/images/hk-kowloon.svg',
  'new-territories': '/images/hk-new-territories.svg',
  'islands': '/images/hk-islands.svg',
}
</script>

<style scoped>
.hk-local-histories-hero {
  background: linear-gradient(135deg, #b85c38 0%, #e07c4f 30%, #d4a574 60%, #c17a4e 100%);
}
</style>
