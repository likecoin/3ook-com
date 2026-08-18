import { checkIsEVMAddress } from '~~/shared/utils'

export const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000
export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000
export const MAX_HEARTBEAT_DELTA_MS = 10 * 60 * 1000
export const WALL_CLOCK_JITTER_MS = 30 * 1000
export const ANALYTICS_FLUSH_THROTTLE_MS = 30 * 1000

// In-product Plus upsell entry points, always reported as `ll_medium` on
// `plus_upsell_*` events regardless of which URL param carries the tag.
// `plus-logo` is absent: it links out of the paywall, so it is an exit.
export const PLUS_UPSELL_SLOTS = [
  'color-mode',
  'custom-voice',
  'library-intro',
  'plus-reading-cta',
  'plus-reading-locked',
  'plus-reading-tag',
  'tts-plus-explainer',
  'tts-plus-tag',
] as const

export const PLUS_UPSELL_SOURCES = [
  'account-page',
  'library',
  'product-page',
  'shelf',
] as const

export type PlusUpsellSlot = typeof PLUS_UPSELL_SLOTS[number]
export type PlusUpsellSource = typeof PLUS_UPSELL_SOURCES[number]

// The checkout surface a subscribe click happened on, reported as
// `checkout_placement`. It gets its own property rather than riding `ll_medium`
// (which names the slot that sent the user here, and would be erased) or the
// `utm_*` props these entry points also set (forwarded to Stripe/RevenueCat,
// where an internal placement would be indistinguishable from a real campaign).
export const PLUS_CHECKOUT_PLACEMENTS = [
  'account-custom-voice',
  'book-upsell-modal',
  'member-page',
  'preview-end',
  'tts-custom-voice',
  'tts-trial-chip',
  'tts-trial-limit',
] as const

export type PlusCheckoutPlacement = typeof PLUS_CHECKOUT_PLACEMENTS[number]

// Which /member entry point a `tts_sample_*` event came from. Both surfaces can
// render on the same page and an affiliate link makes them offer the same voice,
// so the `sample` id alone cannot tell them apart.
export const TTS_SAMPLE_PLACEMENTS = [
  'benefit-link',
  'samples-card',
] as const

export type TTSSamplePlacement = typeof TTS_SAMPLE_PLACEMENTS[number]

// The `tts_sample_*` event suffixes, so the player and the logger agree on them.
export const TTS_SAMPLE_ACTIONS = [
  'pause',
  'play',
  'play_complete',
  'resume',
  'stop',
] as const

export type TTSSampleAction = typeof TTS_SAMPLE_ACTIONS[number]

// Every internal surface ever shipped as `ll_source`. Pre-split clients still
// hold these in PostHog's `initial_utm_source`, where a page name would outrank
// the real channel; also the filter list for the attribution-ladder query.
export const INTERNAL_LL_SOURCES = [
  ...PLUS_UPSELL_SOURCES,
  '3ookcom',
  'about-library',
  'about-page',
  'bookshelf',
  'bookshelf-finished',
  'bookshelf-item',
  'bookstore',
  'bookstore-item',
  'button',
  'copy-link',
  'cs',
  'epub_reader',
  'library-intro',
  'plus-modal',
  'pricing_page',
  'reader',
  'store',
  'store-empty',
  'store-intro',
  'website',
] as const

// Lowercased at build so an entry added with capitals can't silently never match.
const INTERNAL_LL_SOURCE_SET = new Set<string>(
  INTERNAL_LL_SOURCES.map(source => source.toLowerCase()),
)

// Legacy values arrive with the rest of the query glued on
// (`bookshelf-item?from=@someone`), and a book page passes its NFT class id, so
// no fixed list can cover the internal value space on its own.
export function getIsInternalLLSource(source?: string) {
  const value = source?.split('?')[0]?.toLowerCase()
  if (!value) return false
  return checkIsEVMAddress(value) || INTERNAL_LL_SOURCE_SET.has(value)
}

// Store-supplied install sources that name no channel. Play pairs these with
// `utm_medium=organic`, but also sends them with the medium absent or empty —
// and the bridge drops empty strings, so a medium check alone can't catch them.
const NON_CHANNEL_INSTALL_SOURCES = [
  '(direct)',
  '(not set)',
  'google-play',
] as const

// Lowercased at build for the same reason as the internal set above.
const NON_CHANNEL_INSTALL_SOURCE_SET = new Set<string>(
  NON_CHANNEL_INSTALL_SOURCES.map(source => source.toLowerCase()),
)

export function getIsNonChannelInstallSource(source?: string) {
  const value = source?.toLowerCase()
  if (!value) return false
  return NON_CHANNEL_INSTALL_SOURCE_SET.has(value)
}
