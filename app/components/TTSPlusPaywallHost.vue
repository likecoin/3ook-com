<script setup lang="ts">
import type { RouteLocationAsRelativeGeneric } from 'vue-router'

// Renderless: mounting it is what creates the app-lifetime paywall overlays,
// so callers mount it only when a read needs them (see use-preview-end-modal.ts).
defineOptions({ render: () => null })

interface PlusPaywallOptions {
  nftClassId: string
  utmSource: string
  // Defaults to this reader route with TTS on, to play once subscribed.
  redirectRoute?: RouteLocationAsRelativeGeneric
}

const { t: $t } = useI18n()
const toast = useToast()
const route = useRoute()
const { canStartSubscribeFlow } = useNativeIAP()
const { openPaywallModal } = useSubscriptionModal()

function showNotice(actions?: { label: string, onClick: () => void }[]) {
  toast.add({
    title: $t('reader_text_to_speech_plus_reading_only'),
    progress: false,
    ...(actions ? { actions } : { duration: 3000 }),
  })
}

function openPlusPaywall({ nftClassId, utmSource, redirectRoute }: PlusPaywallOptions) {
  if (!canStartSubscribeFlow.value) {
    showNotice()
    return
  }
  openPaywallModal({
    utmSource,
    utmCampaign: nftClassId,
    utmMedium: 'tts_plus_reading_only',
    checkoutPlacement: 'tts-plus-reading-only',
    redirectRoute: redirectRoute || {
      name: route.name,
      params: route.params,
      query: { ...route.query, tts: '1' },
      hash: route.hash,
    },
  })
}

// Only a notice with an opt-in action: a ?tts=1 link may be an outside share,
// so the paywall must not open unasked.
function showNoticeWithPlusAction(options: PlusPaywallOptions) {
  if (!canStartSubscribeFlow.value) {
    showNotice()
    return
  }
  showNotice([{
    label: $t('product_page_tts_plus_explainer_cta'),
    onClick: () => {
      useLogEvent('reader_tts_plus_reading_only_click', {
        nft_class_id: options.nftClassId,
        trigger: 'tts_query_notice',
      })
      openPlusPaywall(options)
    },
  }])
}

defineExpose({ openPlusPaywall, showNoticeWithPlusAction })
</script>
