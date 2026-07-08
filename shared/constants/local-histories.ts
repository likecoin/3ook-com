import { featuredHKLocalHistories } from './featured-hk-local-histories'
import { featuredLocalHistories } from './featured-local-histories'

export interface FeaturedLocalHistoryItem {
  title: string
  // Chinese region name, usually a LocalHistoriesRegionGroup name.
  // TW also uses featured-only buckets (e.g. "全台"/"離島") that map to no region group.
  region: string
  // HK only, rendered as "district · region" subtitle when present
  district?: string
  isPublished: boolean
  summary: string
  tags: string[]
}

export interface LocalHistoriesRegionGroup {
  key: string
  name: string
  areas: string[]
  image: string
}

export interface LocalHistoriesRegionConfig {
  i18nPrefix: string
  heroStats: { labelKey: string, target: number }[]
  heroStyle: Record<string, string>
  // First entry is the "show all" tag
  featuredTags: string[]
  // First region group is selected by default
  regions: LocalHistoriesRegionGroup[]
  items: FeaturedLocalHistoryItem[]
  // CSS variables consumed by LocalHistoriesRegionPage and LocalHistoriesMap
  theme: Record<string, string>
  mapClass?: string
}

export const TW_LOCAL_HISTORIES_CONFIG: LocalHistoriesRegionConfig = {
  i18nPrefix: 'local_histories',
  heroStats: [
    { labelKey: 'local_histories_hero_stat_books', target: 66 },
    { labelKey: 'local_histories_hero_stat_regions', target: 4 },
    { labelKey: 'local_histories_hero_stat_units', target: 12 },
  ],
  heroStyle: {
    backgroundImage: 'url(/images/taiwan-banner.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  featuredTags: ['全部', '文化', '歷史', '飲食', '職人', '社區營造'],
  regions: [
    {
      key: 'north',
      name: '北部',
      areas: ['基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
      image: '/images/north.svg',
    },
    {
      key: 'central',
      name: '中部',
      areas: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
      image: '/images/central.svg',
    },
    {
      key: 'south',
      name: '南部',
      areas: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣', '澎湖縣'],
      image: '/images/south.svg',
    },
    {
      key: 'east',
      name: '東部',
      areas: ['花蓮縣', '台東縣', '綠島', '蘭嶼'],
      image: '/images/east.svg',
    },
    {
      key: 'islands',
      name: '金馬',
      areas: ['金門縣', '連江縣（馬祖）'],
      image: '/images/islands.svg',
    },
  ],
  items: featuredLocalHistories,
  theme: {
    '--lh-ink': '#1f2a22',
    '--lh-kicker': '#6b7a6f',
    '--lh-body': '#4a5f4c',
    '--lh-card-bg': '#f6f4ec',
    '--lh-card-title': '#2f4a3a',
    '--lh-badge-bg': '#e3e8dd',
    '--lh-muted': '#5c6f61',
    '--lh-divider': '#d8dfd2',
    '--lh-accent': '#8fa08a',
    '--lh-dim': '#9aa89b',
    '--lh-featured-ink': '#2f2f4a',
    '--lh-tag-active-bg': '#8aa09f',
    '--lh-tag-active-text': '#effadf',
    '--lh-icon-bg': '#effadf',
    '--lh-icon-text': '#363736',
    '--lh-card-hover-border': '#b6d89e',
    '--lh-input-border': '#c9d3c1',
    '--lh-input-focus': '#9bb59d',
    '--lh-input-ring': '#b9c9b1',
    '--map-fill': 'rgba(127, 178, 149, 0.442)',
    '--map-stroke': 'rgba(99, 142, 117, 0.442)',
    '--map-selected-fill': 'rgba(75, 120, 94, 0.442)',
  },
  mapClass: 'aspect-[4/5]',
}

export const HK_LOCAL_HISTORIES_CONFIG: LocalHistoriesRegionConfig = {
  i18nPrefix: 'hk_local_histories',
  heroStats: [
    { labelKey: 'hk_local_histories_hero_stat_issues', target: 91 },
    { labelKey: 'hk_local_histories_hero_stat_districts', target: 10 },
    { labelKey: 'hk_local_histories_hero_stat_publications', target: 13 },
  ],
  heroStyle: {
    background: 'linear-gradient(135deg, #b85c38 0%, #e07c4f 30%, #d4a574 60%, #c17a4e 100%)',
  },
  featuredTags: ['全部', '社區', '文化', '民生', '環境', '歷史'],
  regions: [
    {
      key: 'hk-island',
      name: '港島',
      areas: ['中西區', '灣仔區', '東區', '南區'],
      image: '/images/hk-hk-island.svg',
    },
    {
      key: 'kowloon',
      name: '九龍',
      areas: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'],
      image: '/images/hk-kowloon.svg',
    },
    {
      key: 'new-territories',
      name: '新界',
      areas: ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區'],
      image: '/images/hk-new-territories.svg',
    },
    {
      key: 'islands',
      name: '離島',
      areas: ['離島區'],
      image: '/images/hk-islands.svg',
    },
  ],
  items: featuredHKLocalHistories,
  theme: {
    '--lh-ink': '#2a1f1a',
    '--lh-kicker': '#8a6f5f',
    '--lh-body': '#5a4a3f',
    '--lh-card-bg': '#f6f0e8',
    '--lh-card-title': '#4a2f1a',
    '--lh-badge-bg': '#e8ddd2',
    '--lh-muted': '#6f5f4f',
    '--lh-divider': '#d8cfc2',
    '--lh-accent': '#a08a78',
    '--lh-dim': '#b0a89b',
    '--lh-featured-ink': '#2a2a4a',
    '--lh-tag-active-bg': '#a08070',
    '--lh-tag-active-text': '#fff5eb',
    '--lh-icon-bg': '#f5e8d8',
    '--lh-icon-text': '#4a3628',
    '--lh-card-hover-border': '#d4a87a',
    '--lh-input-border': '#d1c4b5',
    '--lh-input-focus': '#a08a78',
    '--lh-input-ring': '#c9b9a9',
    '--map-fill': 'rgba(210, 140, 90, 0.45)',
    '--map-stroke': 'rgba(180, 110, 70, 0.45)',
    '--map-selected-fill': 'rgba(180, 100, 60, 0.5)',
    '--map-pin-fill': 'rgba(180, 80, 50, 0.7)',
  },
}
