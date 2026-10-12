// The chart's geometry. BookstoreItem's `chart` variant and its skeleton
// share it, so the list can't shift when the data lands.
// Class strings stay literal for Tailwind.

// The shape, so a top twenty is one edit.
export const LIBRARY_CHART_SIZE = 10
// Second and third place: the ranks highlighted after first.
export const LIBRARY_CHART_HIGHLIGHT_SIZE = 3
export const LIBRARY_CHART_PAIR_SIZE = 2

export const LIBRARY_CHART_LIST_CLASS = 'w-full grid grid-cols-1 tablet:grid-cols-6 gap-3'

export type LibraryChartRankTier = 'hero' | 'highlight' | 'pair' | 'compact'

export function getLibraryChartRankTier(rank: number): LibraryChartRankTier {
  if (rank === 1) return 'hero'
  if (rank <= LIBRARY_CHART_HIGHLIGHT_SIZE) return 'highlight'
  return rank <= LIBRARY_CHART_HIGHLIGHT_SIZE + LIBRARY_CHART_PAIR_SIZE ? 'pair' : 'compact'
}

// First place and the two after it take the accent, a step lighter for the latter;
// the rest are neutral and stripe.
export function getIsLibraryChartHighlighted(tier: LibraryChartRankTier): boolean {
  return tier === 'hero' || tier === 'highlight'
}

// First place a full-width banner, then [2][3] and [4][5] across, then one row each.
// Every rank reads as a horizontal row, so the DOM order is also the visual order.
const LIBRARY_CHART_GRID_PLACEMENT: Record<number, string> = {
  1: 'tablet:col-span-6',
  2: 'tablet:col-span-3',
  3: 'tablet:col-span-3',
  4: 'tablet:col-span-3',
  5: 'tablet:col-span-3',
}

export function getLibraryChartGridClass(rank: number): string {
  return LIBRARY_CHART_GRID_PLACEMENT[rank] || 'tablet:col-span-6'
}

export function getLibraryChartRowClass(tier: LibraryChartRankTier): string {
  return tier === 'hero' ? 'gap-4 p-3 tablet:gap-5 tablet:p-5' : 'gap-3 p-3'
}

// Translucent so the page's cyan wash shows through.
// First place takes the accent, second and third a step lighter of it,
// and the rest stripe: by rank on the phone's single column,
// by row of cards from the tablet up, where [4][5] share a row and so stay plain together.
// Hover is the link's, so the skeleton takes this without it.
export function getLibraryChartSurfaceClass(tier: LibraryChartRankTier, rank: number): string {
  switch (tier) {
    case 'hero':
      return 'bg-theme-cyan/15 rounded-xl'
    case 'highlight':
      return 'bg-theme-cyan/8 rounded-lg'
    default: {
      const isPhoneShaded = rank % 2 === 1
      const isTabletShaded = tier === 'compact' && rank % 2 === 0
      if (isPhoneShaded) return 'bg-theme-white/5 tablet:bg-transparent rounded-lg'
      return isTabletShaded ? 'tablet:bg-theme-white/5 rounded-lg' : 'rounded-lg'
    }
  }
}

export function getLibraryChartHoverClass(tier: LibraryChartRankTier): string {
  return getIsLibraryChartHighlighted(tier) ? 'hover:bg-theme-cyan/25' : 'hover:bg-theme-white/12'
}

// The radius tracks the artwork: a bigger cover carries a rounder corner.
export function getLibraryChartCoverRoundedClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'rounded-lg tablet:rounded-xl'
    case 'highlight':
      return 'rounded-md tablet:rounded-lg'
    default:
      return 'rounded-md'
  }
}

export function getLibraryChartCoverClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'w-20 tablet:w-28'
    case 'highlight':
    case 'pair':
      return 'w-14 tablet:w-16'
    default:
      return 'w-11'
  }
}

// The numeral is the chart's one typographic device:
// weight and size step down the ranks, and only first place takes the accent.
export function getLibraryChartRankClass(tier: LibraryChartRankTier): string {
  switch (tier) {
    case 'hero':
      return 'w-12 text-4xl tablet:text-5xl leading-none text-theme-cyan'
    case 'highlight':
    case 'pair':
      return 'w-10 text-2xl tablet:text-3xl leading-none text-highlighted'
    default:
      return 'w-10 text-2xl leading-none text-muted'
  }
}

export function getLibraryChartTitleClass(tier: LibraryChartRankTier): string {
  return tier === 'hero' ? 'text-lg tablet:text-3xl' : 'text-sm tablet:text-base'
}

export interface LibraryChartItemClasses {
  tier: LibraryChartRankTier
  grid: string
  row: string
  surface: string
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
  const surface = getLibraryChartSurfaceClass(tier, rank)
  return {
    tier,
    grid: getLibraryChartGridClass(rank),
    row: getLibraryChartRowClass(tier),
    surface,
    card: `${surface} ${getLibraryChartHoverClass(tier)}`,
    cover: getLibraryChartCoverClass(tier),
    coverRounded: getLibraryChartCoverRoundedClass(tier),
    rank: getLibraryChartRankClass(tier),
    title: getLibraryChartTitleClass(tier),
  }
}
