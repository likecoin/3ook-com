<template>
  <div class="bg-[#faf8f2] flex flex-col justify-center items-center">
    <section class="w-full relative bg-black text-white py-16 laptop:py-24">
      <div class="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60" />
      <div class="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-4 laptop:px-12">
        <h1 class="text-4xl laptop:text-6xl font-bold mb-6">
          {{ $t('local_histories_hero_title') }}
        </h1>

        <p class="text-lg laptop:text-xl text-gray-300 mb-8 max-w-2xl">
          {{ $t('local_histories_hero_description') }}
        </p>

        <div class="flex items-center gap-2 text-sm text-theme-cyan">
          <UIcon name="i-material-symbols-auto-stories-outline" />
          <span>{{ $t('local_histories_hero_stats') }}</span>
        </div>
      </div>
    </section>
    <div class="mx-auto w-full max-w-6xl px-4 py-10">
      <header class="mb-8">
        <h1 class="text-2xl font-semibold text-neutral-900">
          地區總覽
        </h1>
        <p class="mt-2 text-sm text-neutral-600">
          點擊各區，查看該區的地方誌單位。
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section class="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
          <div class="flex flex-col gap-4">
            <LocalHistoriesMap
              :active-region="activeRegion"
              :selected-region="selectedRegion"
              @region-hover="handleMapHover"
              @region-click="handleMapClick"
            />

            <div class="flex flex-wrap gap-2 text-xs text-neutral-600 lg:hidden">
              <button
                v-for="region in regions"
                :key="region.key"
                type="button"
                class="flex items-center gap-2 rounded-full bg-neutral-50 px-3 py-1 transition"
                :class="selectedRegion === region.key ? 'ring-2 ring-amber-400/80' : ''"
                @click="handleTagClick(region.key)"
              >
                <span
                  class="inline-flex h-2.5 w-2.5 rounded-full"
                  :class="regionClasses[region.key]"
                />
                <span class="hidden lg:inline">{{ region.name }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="hidden flex-col gap-4 lg:flex">
          <div
            v-for="region in regions"
            :key="region.key"
            class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition"
            :class="activeRegion === region.key ? 'bg-amber-50/50 ring-2 ring-amber-400/70 ring-offset-2' : ''"
            role="button"
            tabindex="0"
            @click="handleCardClick(region.key)"
            @mouseenter="handleCardEnter(region.key)"
            @mouseleave="handleCardLeave"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-base font-semibold text-neutral-900">
                <span
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full"
                  :class="regionClasses[region.key]"
                />
                {{ region.name }}
              </div>
              <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                {{ featuredByRegion[region.name]?.length ?? 0 }} 個單位
              </span>
            </div>
            <p class="mt-3 text-sm text-neutral-600">
              {{ region.areas.join('、') }}
            </p>
            <div
              v-if="expandedRegion === region.key"
              class="mt-4 border-t border-neutral-200 pt-3"
            >
              <p class="text-xs font-medium text-neutral-500">
                地方誌單位
              </p>
              <ul class="mt-2 grid gap-2 text-sm text-neutral-600">
                <li
                  v-for="item in featuredByRegion[region.name] ?? []"
                  :key="item.title"
                  class="flex items-center gap-2 min-w-0"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  <NuxtLink
                    v-if="item.isPublished"
                    :to="getStoreQueryLink(item.title)"
                    class="whitespace-nowrap text-amber-700 hover:text-amber-800"
                  >
                    {{ item.title }}
                  </NuxtLink>
                  <span
                    v-else
                    class="whitespace-nowrap text-neutral-400"
                  >
                    {{ item.title }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-xs text-neutral-400">— {{ item.summary }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-12 min-h-[800px]">
        <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-semibold text-neutral-900">
              精選地方誌
            </h2>
            <p class="mt-1 text-sm text-neutral-600">
              搜尋或用關鍵字篩選感興趣的地方誌。
            </p>
          </div>
          <div class="w-full sm:max-w-xs">
            <label
              class="sr-only"
              for="featured-search"
            >搜尋地方誌</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <UIcon name="i-material-symbols-search" />
              </span>
              <input
                id="featured-search"
                v-model="searchTerm"
                type="text"
                placeholder="搜尋地方誌"
                class="w-full rounded-full border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm text-neutral-800 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
            </div>
          </div>
        </header>

        <div class="mb-6 flex flex-wrap gap-2">
          <button
            v-for="tag in featuredTags"
            :key="tag"
            type="button"
            class="rounded-full border px-3 py-1 text-xs font-medium transition"
            :class="activeKeyword === tag ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-amber-200 hover:text-amber-700'"
            @click="toggleKeyword(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <template
            v-for="item in filteredFeatured"
            :key="item.title"
          >
            <NuxtLink
              v-if="item.isPublished"
              :to="getStoreQueryLink(item.title)"
              class="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition hover:border-amber-400"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <UIcon name="i-material-symbols-auto-stories-outline" />
                  </span>
                  <div>
                    <h3 class="text-base font-semibold text-neutral-900">
                      {{ item.title }}
                    </h3>
                    <p class="mt-1 text-xs text-neutral-500">
                      {{ item.region }}
                    </p>
                  </div>
                </div>
              </div>
              <p class="mt-3 text-sm text-neutral-600">
                {{ item.summary }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500"
                >
                  {{ tag }}
                </span>
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
                    <h3 class="text-base font-semibold text-neutral-500">
                      {{ item.title }}
                    </h3>
                    <p class="mt-1 text-xs text-neutral-400">
                      {{ item.region }}
                    </p>
                  </div>
                </div>
              </div>
              <p class="mt-3 text-sm text-neutral-500">
                {{ item.summary }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="rounded-full bg-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-neutral-400"
                >
                  {{ tag }}
                </span>
              </div>
            </article>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { featuredLocalHistories } from '@/constants/featured-local-histories'

const hoveredRegion = ref<string | null>(null)
const selectedRegion = ref<string | null>(null)
const expandedRegion = ref<string | null>(null)

const activeRegion = computed(() => selectedRegion.value ?? hoveredRegion.value)

const handleMapHover = (region: string | null) => {
  hoveredRegion.value = region
}

const handleMapClick = (region: string) => {
  if (selectedRegion.value === region) return
  selectedRegion.value = region
  expandedRegion.value = region
}

const handleCardClick = (regionKey: string) => {
  if (selectedRegion.value === regionKey) return
  selectedRegion.value = regionKey
  expandedRegion.value = regionKey
}

const handleCardEnter = (regionKey: string) => {
  hoveredRegion.value = regionKey
}

const handleCardLeave = () => {
  hoveredRegion.value = null
}

const handleTagClick = (regionKey: string) => {
  if (selectedRegion.value === regionKey) return
  selectedRegion.value = regionKey
  expandedRegion.value = regionKey
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

const getStoreQueryLink = (title: string) => `/store?q=${encodeURIComponent(title)}`

const searchTerm = ref('')
const activeKeyword = ref('全部')

const featuredTags = ['全部', '文化', '生活', '歷史', '飲食', '職人', '地方創生']

const featuredItems = featuredLocalHistories

const filteredFeatured = computed(() => {
  const keyword = activeKeyword.value
  const term = searchTerm.value.trim().toLowerCase()

  const filtered = featuredItems.filter((item) => {
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

const regionClasses: Record<string, string> = {
  north: 'region-north',
  central: 'region-central',
  south: 'region-south',
  east: 'region-east',
  islands: 'region-islands',
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
</style>
