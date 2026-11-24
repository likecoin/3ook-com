import defaultCoverSrc from '~/assets/images/gift-plus-cover.webp'
import qAgentCoverSrc from '~/assets/images/gift-plus-cover-q-agent.webp'
import qAgentHeroSrc from '~/assets/images/gift-plus-hero-q-agent.webp'

export function useGiftPlusArtwork() {
  // Seeded on the server and carried over in the payload, so a request straddling the cutoff hydrates without a mismatch;
  // re-checked on mount because the state outlives client-side navigation.
  const isQAgentPromoActive = useState('gift-plus-q-agent-promo', () => isGiftPlusQAgentPromoActive())
  onMounted(() => {
    isQAgentPromoActive.value = isGiftPlusQAgentPromoActive()
  })

  return {
    coverSrc: computed(() => (isQAgentPromoActive.value ? qAgentCoverSrc : defaultCoverSrc)),
    heroBackdropSrc: computed(() => (isQAgentPromoActive.value ? qAgentHeroSrc : undefined)),
  }
}
