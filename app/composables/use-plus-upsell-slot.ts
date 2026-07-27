import type { PlusUpsellSlot, PlusUpsellSource } from '~~/shared/constants/analytics'

// Wires one upsell entry point to its impression and click events. Impressions
// dedup on the slot alone, not slot + book, so an impression counts "sessions
// that saw this slot" — the denominator we want when ranking slots. Dedup is
// per tab (sessionStorage), so it under-counts long-lived tabs.
export function usePlusUpsellSlot({
  templateRef,
  slot,
  source,
}: {
  templateRef: string
  slot: PlusUpsellSlot
  source: PlusUpsellSource
}) {
  const seenSlots = useSessionStorage<string[]>('3ook_plus_upsell_impressions', [])

  useVisibility(templateRef, (isVisible) => {
    if (!isVisible || seenSlots.value.includes(slot)) return
    seenSlots.value = [...seenSlots.value, slot]
    useLogPlusUpsell('impression', { llMedium: slot, llSource: source })
  })

  function handlePlusUpsellClick() {
    useLogPlusUpsell('click', { llMedium: slot, llSource: source })
  }

  return { handlePlusUpsellClick }
}
