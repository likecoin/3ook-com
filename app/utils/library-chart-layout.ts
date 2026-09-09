// The chart's geometry. BookstoreItem's `chart` variant and its skeleton
// share it, so the list can't shift when the data lands.
// Class strings stay literal for Tailwind.

// The shape. chart-card-layout.ts reads these, so a top twenty is one edit.
export const LIBRARY_CHART_SIZE = 10
export const LIBRARY_CHART_PODIUM_SIZE = 3
export const LIBRARY_CHART_PAIR_SIZE = 2
// Left to right: second, first, third.
export const LIBRARY_CHART_PODIUM_ORDER = [2, 1, 3]
// Shares of the podium's height.
// LIBRARY_CHART_PODIUM_HEIGHT below spells the same numbers out for Tailwind,
// so the two must match.
export const LIBRARY_CHART_PODIUM_HEIGHT_STEP = [1, 0.9, 0.84]

export const LIBRARY_CHART_LIST_CLASS = 'w-full grid grid-cols-1 tablet:grid-cols-6 gap-3'

export type LibraryChartRankTier = 'hero' | 'podium' | 'pair' | 'compact'

export function getLibraryChartRankTier(rank: number): LibraryChartRankTier {
  if (rank === 1) return 'hero'
  if (rank <= LIBRARY_CHART_PODIUM_SIZE) return 'podium'
  return rank <= LIBRARY_CHART_PODIUM_SIZE + LIBRARY_CHART_PAIR_SIZE ? 'pair' : 'compact'
}

// The top three stack cover over title; the rest stay horizontal.
export function getIsLibraryChartPodium(tier: LibraryChartRankTier): boolean {
  return tier === 'hero' || tier === 'podium'
}

// [2][1][3], then [4][5], then one row each, over six columns.
// The DOM stays in rank order — only the placement moves —
// so it still reads correctly aloud.
const LIBRARY_CHART_GRID_PLACEMENT: Record<number, string> = {
  1: 'tablet:col-start-3 tablet:col-span-2 tablet:row-start-1',
  2: 'tablet:col-start-1 tablet:col-span-2 tablet:row-start-1',
  3: 'tablet:col-start-5 tablet:col-span-2 tablet:row-start-1',
  4: 'tablet:col-start-1 tablet:col-span-3 tablet:row-start-2',
  5: 'tablet:col-start-4 tablet:col-span-3 tablet:row-start-2',
}

export function getLibraryChartGridClass(rank: number): string {
  return LIBRARY_CHART_GRID_PLACEMENT[rank] || 'tablet:col-span-6'
}

export function getLibraryChartRowClass(tier: LibraryChartRankTier): string {
  return getIsLibraryChartPodium(tier)
    ? 'gap-4 p-3 tablet:flex-col tablet:items-center tablet:justify-end tablet:text-center tablet:gap-3 tablet:p-5'
    : 'gap-3 p-3'
}

// Only the first stretches to the row, so it sets the height;
// the other two take a share of it and share its floor.
// Keep in step with LIBRARY_CHART_PODIUM_HEIGHT_STEP.
const LIBRARY_CHART_PODIUM_HEIGHT: Record<number, string> = {
  2: 'tablet:self-end tablet:h-[90%]',
  3: 'tablet:self-end tablet:h-[84%]',
}

export function getLibraryChartHeightClass(rank: number): string {
  return LIBRARY_CHART_PODIUM_HEIGHT[rank] || 'tablet:h-full'
}

// Translucent so the page's cyan wash shows through,
// at the alphas the exported card paints.
// Hover is the link's, so the skeleton takes this without it.
export function getLibraryChartSurfaceClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'bg-theme-cyan/15 rounded-xl tablet:rounded-2xl'
    case 'podium':
      return 'bg-theme-white/8 rounded-lg tablet:rounded-xl'
    case 'pair':
      return 'bg-theme-white/8 rounded-lg'
    default:
      return 'bg-theme-white/5 rounded-lg'
  }
}

export function getLibraryChartHoverClass(tier: LibraryChartRankTier): string {
  return tier === 'hero' ? 'hover:bg-theme-cyan/25' : 'hover:bg-theme-white/12'
}

// The radius tracks the artwork: a bigger cover carries a rounder corner.
export function getLibraryChartCoverRoundedClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'rounded-lg tablet:rounded-xl'
    case 'podium':
      return 'rounded-md tablet:rounded-lg'
    default:
      return 'rounded-md'
  }
}

export function getLibraryChartCoverClass(rank: number, tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'w-20 tablet:w-full tablet:max-w-40'
    case 'podium':
      // Second place reads bigger than third.
      return rank === 2
        ? 'w-14 tablet:w-full tablet:max-w-28'
        : 'w-14 tablet:w-full tablet:max-w-24'
    case 'pair':
      return 'w-14 tablet:w-20'
    default:
      return 'w-11'
  }
}

export function getLibraryChartRankClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'w-10 text-3xl text-highlighted'
    case 'podium':
      return 'w-8 text-2xl text-highlighted'
    case 'pair':
      return 'w-8 text-xl text-highlighted'
    default:
      return 'w-8 text-lg text-muted'
  }
}

export function getLibraryChartTitleClass(tier: LibraryChartRankTier): string {
  return tier === 'hero' ? 'text-lg tablet:text-xl' : 'text-sm tablet:text-base'
}

export interface LibraryChartItemClasses {
  tier: LibraryChartRankTier
  isPodium: boolean
  grid: string
  height: string
  row: string
  card: string
  cover: string
  coverRounded: string
  rank: string
  title: string
}

// One call per row, not nine:
// BookstoreItem is mounted for every card in every grid,
// and the other listings never render this layout.
export function getLibraryChartItemClasses(rank: number): LibraryChartItemClasses {
  const tier = getLibraryChartRankTier(rank)
  return {
    tier,
    isPodium: getIsLibraryChartPodium(tier),
    grid: getLibraryChartGridClass(rank),
    height: getLibraryChartHeightClass(rank),
    row: getLibraryChartRowClass(tier),
    card: `${getLibraryChartSurfaceClass(tier)} ${getLibraryChartHoverClass(tier)}`,
    cover: getLibraryChartCoverClass(rank, tier),
    coverRounded: getLibraryChartCoverRoundedClass(tier),
    rank: getLibraryChartRankClass(tier),
    title: getLibraryChartTitleClass(tier),
  }
}
