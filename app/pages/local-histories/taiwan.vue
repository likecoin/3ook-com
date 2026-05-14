<template>
  <div class="flex w-full flex-col justify-center">
    <section class="local-histories-hero w-full min-h-screen flex justify-center relative text-white px-12 py-24 laptop:py-36">
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
            v-text="$t('local_histories_hero_title')"
          />

          <p
            class="text-lg laptop:text-xl text-gray-300 mb-8 max-w-2xl"
            v-text="$t('local_histories_hero_description')"
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
        <div class="flex flex-col gap-4 text-[#1f2a22]">
          <p
            class="text-sm font-semibold uppercase tracking-wider text-[#6b7a6f]"
            v-text="$t('local_histories_about_kicker')"
          />
          <h2
            class="text-2xl laptop:text-3xl font-semibold"
            v-text="$t('local_histories_about_title')"
          />
          <div class="space-y-4 text-base leading-relaxed text-[#4a5f4c]">
            <p v-text="$t('local_histories_about_paragraph_1')" />
            <p v-text="$t('local_histories_about_paragraph_2')" />
            <p v-text="$t('local_histories_about_paragraph_3')" />
          </div>
        </div>
      </div>
    </section>
    <div class="mx-auto w-full max-w-6xl px-4 py-12">
      <header class="mb-8 laptop:mb-12">
        <h2
          class="text-2xl text-center font-semibold text-neutral-900"
          v-text="$t('local_histories_overview_title')"
        />
        <p
          class="mt-2 text-sm text-center text-neutral-600"
          v-text="$t('local_histories_overview_description')"
        />
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section class="hidden bg-transparent lg:block">
          <LocalHistoriesMap
            :active-region="activeRegion"
            :selected-region="selectedRegion"
            @region-hover="handleMapHover"
            @region-click="handleMapClick"
          />
        </section>

        <section class="flex flex-col gap-4">
          <div
            v-for="region in regions"
            :key="region.key"
            class="relative rounded-2xl bg-[#f6f4ec] p-5 shadow-sm transition"
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
              <div class="flex items-center gap-2 text-base font-semibold text-[#2f4a3a]">
                <span v-text="region.name" />
              </div>
              <span
                class="rounded-full bg-[#e3e8dd] px-3 py-1 text-xs font-medium text-[#4a5f4c]"
                v-text="$t('local_histories_unit_count', { count: featuredByRegion[region.name]?.length ?? 0 })"
              />
            </div>
            <p
              class="mt-3 text-sm text-[#5c6f61]"
              v-text="region.areas.join('、')"
            />
            <div
              v-if="selectedRegion === region.key"
              class="mt-4 border-t border-[#d8dfd2] pt-3"
            >
              <ul class="mt-2 grid gap-2 text-sm text-[#5c6f61]">
                <li
                  v-for="item in featuredByRegion[region.name] ?? []"
                  :key="item.title"
                  class="flex items-center gap-2 min-w-0"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-[#8fa08a]" />
                  <NuxtLink
                    v-if="item.isPublished"
                    :to="localeRoute(getStoreQueryRoute(item.title))"
                    class="whitespace-nowrap text-[#2f4a3a] hover:text-[#1f2a22]"
                    @click.stop
                  >{{ item.title }}</NuxtLink>
                  <span
                    v-else
                    class="whitespace-nowrap text-[#9aa89b]"
                    v-text="item.title"
                  />

                  <span
                    class="min-w-0 flex-1 truncate text-xs text-[#9aa89b]"
                    v-text="`— ${item.summary}`"
                  />
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-20 min-h-[800px] px-6 py-8 text-[#2f2f4a]">
        <header class="mb-6">
          <div class="text-center">
            <h2
              class="text-2xl text-center font-semibold text-neutral-900"
              v-text="$t('local_histories_featured_title')"
            />
            <p
              class="mt-1 text-sm text-neutral-900"
              v-text="$t('local_histories_featured_description')"
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
              :class="activeKeyword === tag ? 'border-[#8aa09f] bg-[#8aa09f] text-[#effadf]' : 'border-[#4a4d5f] bg-transparent text-[#2f374a] hover:border-[#9ba2b5] hover:text-[#2f374a]'"
              @click="toggleKeyword(tag)"
              v-text="tag"
            />
          </div>
          <div class="w-full sm:max-w-xs">
            <label
              class="sr-only"
              for="featured-search"
              v-text="$t('local_histories_featured_search_label')"
            />
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa08a]">
                <UIcon name="i-material-symbols-search" />
              </span>
              <input
                id="featured-search"
                v-model="searchTerm"
                type="text"
                :placeholder="$t('local_histories_featured_search_placeholder')"
                class="w-full rounded-full border border-[#c9d3c1] py-2 pl-10 pr-4 text-sm text-[#2f4a3a] shadow-sm focus:border-[#9bb59d] focus:outline-none focus:ring-2 focus:ring-[#b9c9b1]"
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
              class="rounded-2xl border border-[#effadf] bg-white p-4 shadow-sm transition hover:border-[#b6d89e]"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#effadf] text-[#363736]">
                    <UIcon name="i-material-symbols-auto-stories-outline" />
                  </span>
                  <div>
                    <h3
                      class="text-base font-semibold text-neutral-900"
                      v-text="item.title"
                    />
                    <p
                      class="mt-1 text-xs text-neutral-500"
                      v-text="item.region"
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
            <article
              v-else
              class="rounded-2xl border border-neutral-200 bg-neutral-100/70 p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-400">
                    <UIcon name="i-material-symbols-auto-stories-outline" />
                  </span>
                  <div>
                    <h3
                      class="text-base font-semibold text-neutral-500"
                      v-text="item.title"
                    />
                    <p
                      class="mt-1 text-xs text-neutral-400"
                      v-text="item.region"
                    />
                  </div>
                </div>
              </div>
              <p
                class="mt-3 text-sm text-neutral-500"
                v-text="item.summary"
              />
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="rounded-full bg-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-neutral-400"
                  v-text="tag"
                />
              </div>
            </article>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { featuredLocalHistories } from '~~/shared/constants/featured-local-histories'

const localeRoute = useLocaleRoute()

const hoveredRegion = ref<string | null>(null)
const selectedRegion = ref<string | null>('north')

const activeRegion = computed(() => selectedRegion.value ?? hoveredRegion.value)

const handleMapHover = (region: string | null) => {
  hoveredRegion.value = region
}

const handleMapClick = (region: string) => {
  if (selectedRegion.value === region) return
  selectedRegion.value = region
}

const handleCardClick = (regionKey: string) => {
  selectedRegion.value = selectedRegion.value === regionKey ? null : regionKey
}

const featuredByRegion = computed(() => {
  const map: Record<string, typeof featuredLocalHistories> = {}
  featuredLocalHistories.forEach((item) => {
    if (!map[item.region]) {
      map[item.region] = []
    }
    map[item.region]?.push(item)
  })

  Object.values(map).forEach((items) => {
    items.sort((a, b) => Number(b.isPublished) - Number(a.isPublished))
  })
  return map
})

const searchTerm = ref('')
const debouncedSearchTerm = refDebounced(searchTerm, 300)
const activeKeyword = ref('全部')

const featuredTags = ['全部', '文化', '歷史', '飲食', '職人', '社區營造']

const filteredFeatured = computed(() => {
  const keyword = activeKeyword.value
  const term = debouncedSearchTerm.value.trim().toLowerCase()

  const filtered = featuredLocalHistories.filter((item) => {
    const matchesKeyword = keyword === '全部' || item.tags.includes(keyword)
    if (!term) return matchesKeyword

    const text = `${item.title} ${item.region} ${item.summary} ${item.tags.join(' ')}`.toLowerCase()
    return matchesKeyword && text.includes(term)
  })

  return filtered.sort((a, b) => Number(b.isPublished) - Number(a.isPublished))
})

const toggleKeyword = (tag: string) => {
  activeKeyword.value = activeKeyword.value === tag ? '全部' : tag
}

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()

useHead({
  title: t('local_histories_page_title'),
  meta: [
    { name: 'description', content: t('local_histories_page_description') },
    { property: 'og:title', content: t('local_histories_page_title') },
    { property: 'og:description', content: t('local_histories_page_description') },
  ],
  link: [
    { rel: 'canonical', href: `${runtimeConfig.public.baseURL}${route.path}` },
  ],
})

const heroStatTargets = [66, 4, 12]

const heroStats = computed(() => [
  { label: t('local_histories_hero_stat_books') },
  { label: t('local_histories_hero_stat_regions') },
  { label: t('local_histories_hero_stat_units') },
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
    key: 'north',
    name: '北部',
    areas: ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
  },
  {
    key: 'central',
    name: '中部',
    areas: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
  },
  {
    key: 'south',
    name: '南部',
    areas: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '澎湖縣'],
  },
  {
    key: 'east',
    name: '東部',
    areas: ['花蓮縣', '台東縣', '綠島', '蘭嶼'],
  },
  {
    key: 'islands',
    name: '金馬',
    areas: ['金門縣', '連江縣（馬祖）'],
  },
]

const regionImages: Record<string, string> = {
  north: '/images/north.svg',
  central: '/images/central.svg',
  south: '/images/south.svg',
  east: '/images/east.svg',
  islands: '/images/islands.svg',
}
</script>

<style scoped>
.region-north {
  background-color: #94b5f4;
}

.region-central {
  background-color: #a7d7b8;
}

.region-south {
  background-color: #f5c29a;
}

.region-east {
  background-color: #f3a6b1;
}

.region-islands {
  background-color: #d0c5f1;
}

.local-histories-hero {
  background-image: url('/images/taiwan-banner.png');
  background-size: cover;
  background-position: center;
}
</style>
