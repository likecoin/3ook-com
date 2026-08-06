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
// (a super-property carrying last-touch link tags, so writing it here would
// erase the slot that sent the user) or the `utm_*` props these entry points
// also set (forwarded to Stripe/RevenueCat, where an internal placement would
// be indistinguishable from a real campaign).
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
