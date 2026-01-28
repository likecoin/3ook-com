<template>
  <div class="local-histories-page bg-[#faf8f2]">
    <section class="relative bg-black text-white py-16 laptop:py-24">
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
    <div class="mx-auto max-w-6xl px-4 py-10">
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

            <div
              v-if="selectedRegionData && expandedRegion === selectedRegionData.key"
              class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-neutral-700 lg:hidden"
            >
              <ul class="grid gap-2">
                <li
                  v-for="unit in selectedRegionData.units"
                  :key="unit"
                  class="flex items-center gap-2"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {{ unit }}
                </li>
              </ul>
            </div>

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
                <span class="lg:hidden">{{ region.name }}（{{ region.units.length }}）</span>
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
                {{ region.units.length }} 個單位
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
                  v-for="unit in region.units"
                  :key="unit"
                  class="flex items-center gap-2"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                  {{ unit }}
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const hoveredRegion = ref<string | null>(null)
const selectedRegion = ref<string | null>(null)
const expandedRegion = ref<string | null>(null)

const activeRegion = computed(() => selectedRegion.value ?? hoveredRegion.value)

const handleMapHover = (region: string | null) => {
  hoveredRegion.value = region
}

const handleMapClick = (region: string) => {
  selectedRegion.value = selectedRegion.value === region ? null : region
  expandedRegion.value = selectedRegion.value
}

const handleCardClick = (regionKey: string) => {
  selectedRegion.value = regionKey
  expandedRegion.value = expandedRegion.value === regionKey ? null : regionKey
}

const handleCardEnter = (regionKey: string) => {
  hoveredRegion.value = regionKey
}

const handleCardLeave = () => {
  hoveredRegion.value = null
}

const handleTagClick = (regionKey: string) => {
  selectedRegion.value = selectedRegion.value === regionKey ? null : regionKey
  expandedRegion.value = selectedRegion.value
}

const selectedRegionData = computed(() => regions.find(region => region.key === selectedRegion.value) ?? null)

const regions = [
  {
    key: 'north',
    name: '北部',
    areas: ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
    units: ['北部地方誌單位 A', '北部地方誌單位 B', '北部地方誌單位 C'],
  },
  {
    key: 'central',
    name: '中部',
    areas: ['苗栗縣', '台中市', '彰化縣', '南投縣'],
    units: ['中部地方誌單位 A', '中部地方誌單位 B'],
  },
  {
    key: 'south',
    name: '南部',
    areas: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '澎湖縣', '雲林縣'],
    units: ['南部地方誌單位 A', '南部地方誌單位 B', '南部地方誌單位 C', '南部地方誌單位 D'],
  },
  {
    key: 'east',
    name: '東部',
    areas: ['花蓮縣', '台東縣', '綠島', '蘭嶼'],
    units: ['東部地方誌單位 A', '東部地方誌單位 B'],
  },
  {
    key: 'islands',
    name: '金馬',
    areas: ['金門縣', '連江縣（馬祖）'],
    units: ['離島地方誌單位 A'],
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
