<template>
  <UModal
    :title="$t('app_debug_info_title')"
    :description="$t('app_debug_info_description')"
    :ui="{ body: 'space-y-6', footer: 'justify-end' }"
    @update:open="open => !open && emit('close')"
  >
    <template #body>
      <section
        v-for="section in sections"
        :key="section.title"
        class="space-y-2"
      >
        <h3
          class="text-xs font-semibold uppercase tracking-wide text-muted"
          v-text="section.title"
        />

        <dl class="text-sm divide-y divide-default">
          <div
            v-for="row in section.rows"
            :key="row.label"
            class="flex items-start justify-between gap-4 py-1"
          >
            <dt
              class="shrink-0 text-muted"
              v-text="row.label"
            />
            <dd
              class="font-mono text-right break-all"
              v-text="row.value"
            />
          </div>
        </dl>
      </section>
    </template>

    <template #footer>
      <UButton
        :label="$t('app_debug_info_copy')"
        icon="i-material-symbols-content-copy-outline-rounded"
        color="neutral"
        variant="outline"
        @click="handleCopy"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const { t: $t, locale } = useI18n()
const toast = useToast()
const { copy: copyToClipboard } = useClipboard()
const { user } = useUserSession()
const { isApp, isNativeBridge, appPlatform, buildVersion } = useAppDetection()
const { hasDevicePlus, isPlusOrDevicePlus } = useDevicePlusEntitlement()
const { commitSHA, isTestnet } = useRuntimeConfig().public
const { onLoaded: onPostHogLoaded } = useScriptPostHog()

// The overlay instantiates this only on open, so setup always runs on the
// client and these can be read straight off `window`.
const nativeFeatures = getNativeFeatures()
const installAttribution = getInstallAttribution()
const userAgent = navigator.userAgent
const pageURL = window.location.href
const capturedAt = new Date().toISOString()
const screenSize = `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}x`
const isOnline = useOnline()

// PostHog loads lazily, so this is the one value that can land after open.
const posthogDistinctId = ref('')
onPostHogLoaded(({ posthog }) => {
  posthogDistinctId.value = posthog.get_distinct_id?.() || ''
})

// Full values: this is what gets pasted into a bug report, so the wallet and
// the long strings go in whole even though the rows on screen abbreviate them.
const debugInfo = computed(() => ({
  build: {
    buildVersion: buildVersion.value ?? null,
    platform: appPlatform.value,
    commitSHA: commitSHA || null,
    isTestnet: !!isTestnet,
    isApp: isApp.value,
    isNativeBridge: isNativeBridge.value,
  },
  nativeFeatures: [...nativeFeatures],
  installAttribution,
  entitlement: {
    isLikerPlus: !!user.value?.isLikerPlus,
    isLikerPlusTrial: !!user.value?.isLikerPlusTrial,
    likerPlusTier: user.value?.likerPlusTier ?? null,
    likerPlusProvider: user.value?.likerPlusProvider ?? null,
    likerPlusStore: user.value?.likerPlusStore ?? null,
    subscriptionStatus: user.value?.likerPlusSubscriptionStatus ?? null,
    hasDevicePlus: hasDevicePlus.value,
    isPlusOrDevicePlus: isPlusOrDevicePlus.value,
  },
  identity: {
    likerId: user.value?.likerId ?? null,
    evmWallet: user.value?.evmWallet ?? null,
    posthogDistinctId: posthogDistinctId.value || null,
  },
  environment: {
    pageURL,
    capturedAt,
    locale: locale.value,
    isOnline: isOnline.value,
    screen: screenSize,
    userAgent,
  },
}))

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function buildRows(source: Record<string, unknown>) {
  return Object.entries(source).map(([label, value]) => ({
    label,
    value: formatValue(value),
  }))
}

// installedAt is untrusted — getInstallAttribution only checks it is finite, and
// an out-of-range epoch makes toISOString throw from inside a render computed.
function formatTimestamp(epochMs: number): string {
  const date = new Date(epochMs)
  return Number.isNaN(date.getTime()) ? String(epochMs) : date.toISOString()
}

const sections = computed(() => {
  const { build, entitlement, identity, environment } = debugInfo.value
  return [
    { title: $t('app_debug_info_section_build'), rows: buildRows(build) },
    {
      title: $t('app_debug_info_section_native_bridge'),
      rows: buildRows({ features: nativeFeatures.join(', ') }),
    },
    ...(installAttribution
      ? [{
          title: $t('app_debug_info_section_install_attribution'),
          // affiliateFrom is intentionally absent: getInstallAttribution keeps
          // the money-routing id out of the analytics map it returns.
          rows: buildRows({
            installedAt: formatTimestamp(installAttribution.installedAt),
            ...installAttribution.attribution,
          }),
        }]
      : []),
    { title: $t('app_debug_info_section_entitlement'), rows: buildRows(entitlement) },
    {
      title: $t('app_debug_info_section_identity'),
      rows: buildRows({
        ...identity,
        evmWallet: identity.evmWallet ? shortenWalletAddress(identity.evmWallet) : null,
      }),
    },
    {
      title: $t('app_debug_info_section_environment'),
      rows: buildRows({
        ...environment,
        pageURL: truncateText(environment.pageURL, 48),
        userAgent: truncateText(environment.userAgent, 48),
      }),
    },
  ]
})

async function handleCopy() {
  try {
    await copyToClipboard(JSON.stringify(debugInfo.value, null, 2))
    useLogEvent('app_debug_info_copy')
    toast.add({
      title: $t('app_debug_info_copy_success'),
      icon: 'i-material-symbols-check-circle-outline-rounded',
      duration: 3000,
      color: 'success',
    })
  }
  catch (error) {
    console.error('Failed to copy debug info:', error)
    toast.add({
      title: $t('app_debug_info_copy_failed'),
      icon: 'i-material-symbols-error-circle-rounded',
      duration: 3000,
      color: 'error',
    })
  }
}
</script>
