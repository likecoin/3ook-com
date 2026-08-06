import type { PlusUpsellSlot, PlusUpsellSource } from '~~/shared/constants/analytics'

const SEEN_SLOTS_KEY = '3ook_plus_upsell_impressions'

// Read sessionStorage directly rather than through useSessionStorage: sibling
// slots intersect in one observer callback, and a ref only sees a sibling's
// write on the next flush — so the same slot would log twice.
function getSeenSlots(): string[] {
  try {
    const stored = sessionStorage.getItem(SEEN_SLOTS_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

function markSlotSeen(slot: PlusUpsellSlot, seenSlots: string[]) {
  try {
    sessionStorage.setItem(SEEN_SLOTS_KEY, JSON.stringify([...seenSlots, slot]))
  }
  catch {
    // A private-mode quota failure must not cost us the event itself.
  }
}

// Logs the impression half of an upsell slot. Impressions dedup on the slot
// alone, not slot + book, so an impression counts "sessions that saw this slot"
// — the denominator we want when ranking slots. Dedup is per tab
// (sessionStorage), so it under-counts long-lived tabs.
export function usePlusUpsellImpression({
  templateRef,
  slot,
  source,
  // Some slots also render for members and in-app users as plain navigation;
  // only the arm that routes to the paywall is an upsell.
  isEligible = true,
}: {
  templateRef: string
  slot: PlusUpsellSlot
  source: PlusUpsellSource
  isEligible?: MaybeRefOrGetter<boolean>
}) {
  // A slot already recorded this tab can never log again, so skip observing it.
  if (getSeenSlots().includes(slot)) return

  useVisibility(templateRef, (isVisible) => {
    if (!isVisible || !toValue(isEligible)) return
    const seenSlots = getSeenSlots()
    if (seenSlots.includes(slot)) return
    markSlotSeen(slot, seenSlots)
    useLogPlusUpsell('impression', { llMedium: slot, llSource: source })
  })
}

// Wires one upsell entry point to both its impression and click events.
export function usePlusUpsellSlot({
  templateRef,
  slot,
  source,
}: {
  templateRef: string
  slot: PlusUpsellSlot
  source: PlusUpsellSource
}) {
  usePlusUpsellImpression({ templateRef, slot, source })

  function handlePlusUpsellClick() {
    useLogPlusUpsell('click', { llMedium: slot, llSource: source })
  }

  return { handlePlusUpsellClick }
}
