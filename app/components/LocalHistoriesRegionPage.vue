<template>
  <div
    class="flex w-full flex-col justify-center"
    :style="config.theme"
  >
    <section
      class="w-full min-h-screen flex justify-center relative text-white px-12 py-24 laptop:py-36"
      :style="config.heroStyle"
    >
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
      <div class="absolute z-10 bottom-[60px] left-1/2 transform -translate-x-1/2 w-full max-w-2xl text-center text-white">
        <div class="flex justify-center mb-6">
          <LocalHistoriesScrollIndicator class="mx-auto" />
        </div>
        <h1
          class="text-4xl laptop:text-6xl font-bold mb-6"
          v-text="t(`${config.i18nPrefix}_hero_title`)"
        />

        <p
          class="text-lg laptop:text-xl text-white/90 mb-8 max-w-2xl"
          v-text="t(`${config.i18nPrefix}_hero_description`)"
        />
      </div>
    </section>
    <section class="w-full bg-white">
      <div class="mx-auto w-full max-w-6xl px-4 py-12 laptop:p-24 laptop:pt-18">
        <div
          ref="heroStatsSection"
          class="grid grid-cols-3 gap-4 text-center mb-20"
        >
          <div
            v-for="stat in heroStats"
            :key="stat.labelKey"
            class="flex flex-col items-center gap-1"
          >
            <span
              class="text-2xl laptop:text-3xl font-semibold"
              v-text="stat.value"
            />
            <span
              class="text-sm text-black"
              v-text="stat.label"
            />
          </div>
        </div>
        <div class="flex flex-col gap-4 text-(--lh-ink)">
          <p
            class="text-sm font-semibold uppercase tracking-wider text-(--lh-kicker)"
            v-text="t(`${config.i18nPrefix}_about_kicker`)"
          />
          <h2
            class="text-2xl laptop:text-3xl font-semibold"
            v-text="t(`${config.i18nPrefix}_about_title`)"
          />
          <div class="space-y-4 text-base leading-relaxed text-(--lh-body)">
            <p v-text="t(`${config.i18nPrefix}_about_paragraph_1`)" />
            <p v-text="t(`${config.i18nPrefix}_about_paragraph_2`)" />
            <p v-text="t(`${config.i18nPrefix}_about_paragraph_3`)" />
          </div>
        </div>
      </div>
    </section>
    <div class="mx-auto w-full max-w-6xl px-4 py-12">
      <header class="mb-8 laptop:mb-12">
        <h2
          class="text-2xl text-center font-semibold text-neutral-900"
          v-text="t(`${config.i18nPrefix}_overview_title`)"
        />
        <p
          class="mt-2 text-sm text-center text-neutral-600"
          v-text="t(`${config.i18nPrefix}_overview_description`)"
        />
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section class="hidden bg-transparent lg:block">
          <LocalHistoriesMap
            :class="config.mapClass"
            :aria-label="t(`${config.i18nPrefix}_map_aria_label`)"
            :selected-key="selectedKey"
            @key-click="handleMapClick"
          >
            <template #paths>
              <slot name="map-paths" />
            </template>
            <template
              v-if="$slots['map-pins']"
              #pins
            >
              <slot name="map-pins" />
            </template>
          </LocalHistoriesMap>
        </section>

        <section class="flex flex-col gap-4">
          <div
            v-for="region in config.regions"
            :key="region.key"
            class="relative cursor-pointer rounded-2xl bg-(--lh-card-bg) p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
            :class="selectedKey === region.key ? 'ring-2 ring-(--lh-tag-active-bg) shadow-md' : 'hover:ring-1 hover:ring-(--lh-divider)'"
            role="button"
            tabindex="0"
            @click="handleCardClick(region.key)"
            @keydown.enter="handleCardClick(region.key)"
            @keydown.space.prevent="handleCardClick(region.key)"
          >
            <div
              class="pointer-events-none absolute inset-0 rounded-2xl bg-cover bg-center opacity-30"
              :style="{ backgroundImage: `url(${region.image})` }"
            />
            <div class="flex items-center justify-between">
              <span
                class="text-base font-semibold text-(--lh-card-title)"
                v-text="region.name"
              />
              <div class="flex items-center gap-2">
                <span
                  class="rounded-full bg-(--lh-badge-bg) px-3 py-1 text-xs font-medium text-(--lh-body)"
                  v-text="t(`${config.i18nPrefix}_unit_count`, { count: featuredByRegion[region.key]?.length ?? 0 })"
                />
                <UIcon
                  name="i-material-symbols-expand-more-rounded"
                  class="text-lg text-(--lh-accent) transition-transform duration-200"
                  :class="selectedKey === region.key ? 'rotate-180' : ''"
                />
              </div>
            </div>
            <p
              class="mt-3 text-sm text-(--lh-muted)"
              v-text="region.areas.join('、')"
            />
            <div
              v-if="selectedKey === region.key"
              class="mt-4 border-t border-(--lh-divider) pt-3"
            >
              <ul class="mt-2 grid gap-2 text-sm text-(--lh-muted)">
                <li
                  v-for="item in featuredByRegion[region.key] ?? []"
                  :key="item.title"
                  class="flex items-center gap-2 min-w-0"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-(--lh-accent)" />
                  <NuxtLink
                    v-if="item.isPublished"
                    :to="localeRoute(getStoreQueryRoute(item.title))"
                    class="whitespace-nowrap text-(--lh-card-title) hover:text-(--lh-ink)"
                    @click.stop
                  >{{ item.title }}</NuxtLink>
                  <span
                    v-else
                    class="whitespace-nowrap text-(--lh-dim)"
                    v-text="item.title"
                  />

                  <span
                    class="min-w-0 flex-1 truncate text-xs text-(--lh-dim)"
                    v-text="`— ${item.summary}`"
                  />
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section class="mt-20 min-h-[800px] px-6 py-8 text-(--lh-featured-ink)">
        <header class="mb-6">
          <div class="text-center">
            <h2
              class="text-2xl text-center font-semibold text-neutral-900"
              v-text="t(`${config.i18nPrefix}_featured_title`)"
            />
            <p
              class="mt-1 text-sm text-neutral-900"
              v-text="t(`${config.i18nPrefix}_featured_description`)"
            />
          </div>
        </header>

        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in config.featuredTags"
              :key="tag"
              type="button"
              class="rounded-full border px-3 py-1 text-xs font-medium transition"
              :class="activeKeyword === tag ? 'border-(--lh-tag-active-bg) bg-(--lh-tag-active-bg) text-(--lh-tag-active-text)' : 'border-[#4a4d5f] bg-transparent text-[#2f374a] hover:border-[#9ba2b5] hover:text-[#2f374a]'"
              @click="toggleKeyword(tag)"
              v-text="tag"
            />
          </div>
          <div class="w-full sm:max-w-xs">
            <label
              class="sr-only"
              for="featured-search"
              v-text="t(`${config.i18nPrefix}_featured_search_label`)"
            />
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--lh-accent)">
                <UIcon name="i-material-symbols-search" />
              </span>
              <input
                id="featured-search"
                v-model="searchTerm"
                type="text"
                :placeholder="t(`${config.i18nPrefix}_featured_search_placeholder`)"
                class="w-full rounded-full border border-(--lh-input-border) py-2 pl-10 pr-4 text-sm text-(--lh-card-title) shadow-sm focus:border-(--lh-input-focus) focus:outline-none focus:ring-2 focus:ring-(--lh-input-ring)"
              >
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <component
            :is="item.isPublished ? NuxtLink : 'div'"
            v-for="item in filteredFeatured"
            :key="item.title"
            :to="item.isPublished ? localeRoute(getStoreQueryRoute(item.title)) : undefined"
            class="rounded-2xl border border-(--lh-icon-bg) bg-white p-4"
            :class="item.isPublished ? 'shadow-sm transition hover:border-(--lh-card-hover-border)' : 'opacity-60'"
          >
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-full bg-(--lh-icon-bg) text-(--lh-icon-text)">
                <UIcon name="i-material-symbols-auto-stories-outline" />
              </span>
              <div>
                <h3
                  class="text-base font-semibold text-neutral-900"
                  v-text="item.title"
                />
                <p
                  class="mt-1 text-xs text-neutral-500"
                  v-text="getItemSubtitle(item)"
                />
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
          </component>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import type { FeaturedLocalHistoryItem, LocalHistoriesRegionConfig } from '~~/shared/constants/local-histories'

const props = defineProps<{
  config: LocalHistoriesRegionConfig
}>()

const localeRoute = useLocaleRoute()
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
const route = useRoute()

useHead({
  title: t(`${props.config.i18nPrefix}_page_title`),
  meta: [
    { name: 'description', content: t(`${props.config.i18nPrefix}_page_description`) },
    { property: 'og:title', content: t(`${props.config.i18nPrefix}_page_title`) },
    { property: 'og:description', content: t(`${props.config.i18nPrefix}_page_description`) },
  ],
  link: [
    { rel: 'canonical', href: `${runtimeConfig.public.baseURL}${route.path}` },
  ],
})

const selectedKey = ref<string | null>(props.config.regions[0]?.key ?? null)

const handleMapClick = (key: string) => {
  if (selectedKey.value === key) return
  selectedKey.value = key
}

const handleCardClick = (key: string) => {
  selectedKey.value = selectedKey.value === key ? null : key
}

const comparePublishedFirst = (a: FeaturedLocalHistoryItem, b: FeaturedLocalHistoryItem) =>
  Number(b.isPublished) - Number(a.isPublished)

const regionNameToKey = computed(() =>
  Object.fromEntries(props.config.regions.map(region => [region.name, region.key])),
)

const featuredByRegion = computed(() => {
  const map: Record<string, FeaturedLocalHistoryItem[]> = {}
  props.config.items.forEach((item) => {
    const key = regionNameToKey.value[item.region]
    if (!key) return
    if (!map[key]) {
      map[key] = []
    }
    map[key]?.push(item)
  })

  Object.values(map).forEach((items) => {
    items.sort(comparePublishedFirst)
  })
  return map
})

const getItemSubtitle = (item: FeaturedLocalHistoryItem) =>
  item.district ? `${item.district} · ${item.region}` : item.region

const searchTerm = ref('')
const debouncedSearchTerm = refDebounced(searchTerm, 300)

const allTag = computed(() => props.config.featuredTags[0] ?? '')
const activeKeyword = ref(allTag.value)

const filteredFeatured = computed(() => {
  const keyword = activeKeyword.value
  const term = debouncedSearchTerm.value.trim().toLowerCase()

  const filtered = props.config.items.filter((item) => {
    const matchesKeyword = keyword === allTag.value || item.tags.includes(keyword)
    if (!term) return matchesKeyword

    const text = [item.title, item.district, item.region, item.summary, ...item.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return matchesKeyword && text.includes(term)
  })

  return filtered.sort(comparePublishedFirst)
})

const toggleKeyword = (tag: string) => {
  activeKeyword.value = activeKeyword.value === tag ? allTag.value : tag
}

const statsProgress = ref(0)
const transitionedProgress = useTransition(statsProgress, { duration: 700 })
const heroStats = computed(() =>
  props.config.heroStats.map(stat => ({
    ...stat,
    label: t(stat.labelKey),
    value: Math.round(stat.target * transitionedProgress.value),
  })),
)

useVisibility('heroStatsSection', (isVisible) => {
  if (isVisible) {
    statsProgress.value = 1
  }
}, { threshold: 0.4 })
</script>
