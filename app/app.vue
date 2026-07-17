<template>
  <NuxtLoadingIndicator />
  <NuxtPwaAssets />
  <UApp :toaster="{ position: 'top-right' }">
    <MaintenancePage v-if="isShowMaintenancePage" />
    <NuxtLayout v-else>
      <NuxtPage class="flex flex-col grow" />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { useDocumentVisibility } from '@vueuse/core'

import { SESSION_REFRESH_TIMESTAMP_KEY } from '~/stores/account'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '~/utils/app-store'

const { t: $t, locales } = useI18n()
const config = useRuntimeConfig()
const ogTitle = $t('app_title')
const ogDescription = $t('app_description')
const ogURL = config.public.baseURL
const ogImage = `${ogURL}/images/og/default.jpg`
const ogAlternateNames = ['Liker Land 電子書店', 'Liker Land']
const ogLocaleCodes = locales.value.map(l => l.language || l.code)
const isTestnet = !!config.public.isTestnet
const likeCoinAPIEndpoint = config.public.likeCoinAPIEndpoint as string | undefined
const likeCoinStaticEndpoint = config.public.likeCoinStaticEndpoint as string | undefined
const posthogHost = config.public.posthogHost as string | undefined

const { memberProgramData } = useMemberProgramStructuredData()

const { initializeServerGeolocation, initializeClientGeolocation } = useDetectedGeolocation()
const { initializePaymentCurrency } = usePaymentCurrency()
const { initializeLocale } = useAutoLocale()
const { initializeRegion } = useRegion()
const { isApp, isIOS } = useAppDetection()

callOnce(() => {
  initializeServerGeolocation()
})

onMounted(async () => {
  initializeClientGeolocation()
  await initializePaymentCurrency()
  await initializeLocale()
  await initializeRegion()
})

const i18nHead = useLocaleHead()

const { user } = useUserSession()
const accountStore = useAccountStore()

// JWT lifetime is 1d; refreshing at the 12h mark keeps a 12h headroom so
// timing slips around expiry don't leave a stale token in the cookie session
// or in the native Intercom SDK's keychain.
const SESSION_REFRESH_THRESHOLD_MS = 12 * 60 * 60 * 1000

// Read directly from localStorage rather than via useStorage: VueUse's ref
// only updates from cross-tab `storage` events, so in-tab writes from the
// store's refreshSessionInfo wouldn't propagate to a cached ref.
function getLastSessionRefreshTs(): number {
  if (!import.meta.client) return 0
  return Number(localStorage.getItem(SESSION_REFRESH_TIMESTAMP_KEY)) || 0
}

async function maybeRefreshSession() {
  if (!user.value) return
  if (Date.now() - getLastSessionRefreshTs() <= SESSION_REFRESH_THRESHOLD_MS) return
  try {
    await accountStore.refreshSessionInfo()
  }
  catch (error) {
    console.warn('Failed to refresh session info:', error)
  }
}

// Relies on registerType: 'autoUpdate' in nuxt.config.ts to actually reload
// when a new sw.js is found; this just provokes the recheck. Tracks its own
// timestamp because maybeRefreshSession's only advances for logged-in users,
// which would let logged-out tabs probe update() on every refocus.
const SW_UPDATE_CHECK_TIMESTAMP_KEY = 'lastSWUpdateCheckTs'

function getLastSWUpdateCheckTs(): number {
  if (!import.meta.client) return 0
  return Number(localStorage.getItem(SW_UPDATE_CHECK_TIMESTAMP_KEY)) || 0
}

let inFlightSWUpdate: Promise<void> | null = null
async function maybeUpdateServiceWorker() {
  if (!import.meta.client) return
  if (!('serviceWorker' in navigator)) return
  if (Date.now() - getLastSWUpdateCheckTs() <= SESSION_REFRESH_THRESHOLD_MS) return
  if (inFlightSWUpdate) return inFlightSWUpdate
  inFlightSWUpdate = (async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      await registration?.update()
      localStorage.setItem(SW_UPDATE_CHECK_TIMESTAMP_KEY, String(Date.now()))
    }
    catch (error) {
      console.warn('Failed to check for service worker update:', error)
    }
    finally {
      inFlightSWUpdate = null
    }
  })()
  return inFlightSWUpdate
}

onMounted(() => {
  maybeRefreshSession()
})

// Long-lived sessions never re-mount this component, and continuously-used
// sessions can age past the JWT lifetime. Hook visibility transitions so a
// foregrounded WebView (after iOS/Android resume) or a refocused browser tab
// catches up without waiting for a full reload.
const visibility = useDocumentVisibility()
watch(visibility, (state, prev) => {
  if (state === 'visible' && prev !== 'visible') {
    Promise.allSettled([maybeRefreshSession(), maybeUpdateServiceWorker()])
  }
})
useHead({
  htmlAttrs: {
    lang: i18nHead.value.htmlAttrs!.lang,
  },
  meta: [
    ...(i18nHead.value.meta || []),
    {
      name: 'viewport',
      content:
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    },
    {
      name: 'description',
      content: ogDescription,
    },
    ...(isTestnet
      ? [
          {
            name: 'robots',
            content: 'noindex',
          },
        ]
      : []),
    {
      property: 'og:site_name',
      content: ogTitle,
    },
    {
      property: 'og:title',
      content: ogTitle,
    },
    {
      property: 'og:description',
      content: ogDescription,
    },
    {
      property: 'og:image',
      content: ogImage,
    },
    {
      property: 'og:url',
      content: ogURL,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'base:app_id',
      content: '693c33358a7c4e55fec73fbd',
    },
    {
      name: 'fc:miniapp',
      content: JSON.stringify({
        version: 'next',
        imageUrl: ogImage,
        button: {
          title: 'Start Reading',
          action: {
            type: 'launch_miniapp',
            name: '3ook.com',
            url: 'https://3ook.com/store',
          },
        },
      }),
    },
  ],
  titleTemplate: title => title ? `${title} | ${$t('app_title')}` : $t('app_title'),
  link: [
    {
      rel: 'me',
      href: 'https://www.threads.com/@3ookcom',
    },
    // Skip on iOS: priming WKWebView's app-level NSURLSession pool with a
    // cross-origin CORS preconnect can wedge a poisoned connection that fails
    // every later $fetch with "Load failed: <no response>" until the app is
    // killed — reload alone doesn't recover it.
    ...(likeCoinAPIEndpoint && !isIOS.value
      ? [{ rel: 'preconnect', href: likeCoinAPIEndpoint, crossorigin: '', key: 'preconnect-like-api' }]
      : []),
    ...(likeCoinStaticEndpoint
      ? [{ rel: 'preconnect', href: likeCoinStaticEndpoint, key: 'preconnect-like-static' }]
      : []),
    ...(posthogHost
      ? [{ rel: 'preconnect', href: posthogHost, crossorigin: '', key: 'preconnect-posthog' }]
      : []),
    ...(!isApp.value
      ? [{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '', key: 'preconnect-stripe' }]
      : []),
    ...(i18nHead.value.link || []),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify([{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${ogURL}/#website`,
        'name': ogTitle,
        'alternateName': ogAlternateNames,
        'url': ogURL,
        'inLanguage': ogLocaleCodes,
        'publisher': { '@id': `${ogURL}/#organization` },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': `${ogURL}/store?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        '@id': `${ogURL}/#organization`,
        'name': ogTitle,
        'legalName': COMPANY_LEGAL_NAME,
        'description': ogDescription,
        'alternateName': ogAlternateNames,
        'sameAs': [
          'https://linktr.ee/3ookcom',
          'https://www.instagram.com/3ookcom',
          'https://www.facebook.com/3ookcom',
          'https://review.3ook.com',
          'https://x.com/3ookcom',
          'https://www.threads.com/@3ookcom',
          'https://www.linkedin.com/company/3ookcom',
        ],
        'url': ogURL,
        'logo': ogImage,
        'email': CUSTOMER_SERVICE_EMAIL,
        'contactPoint': [
          {
            '@type': 'ContactPoint',
            'contactType': 'customer service',
            'email': CUSTOMER_SERVICE_EMAIL,
            'url': `${ogURL}/contact`,
            'availableLanguage': ['English', 'Chinese'],
          },
        ],
        'brand': [
          {
            '@context': 'https://schema.org',
            '@type': 'Brand',
            'url': ogURL,
            'name': '3ook.com',
          },
        ],
        'hasMemberProgram': memberProgramData.value,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        'name': $t('app_name'),
        'operatingSystem': 'iOS',
        'applicationCategory': 'BookReaderApplication',
        'offers': {
          '@type': 'Offer',
          'price': 0,
          'priceCurrency': 'USD',
        },
        'installUrl': APP_STORE_URL,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        'name': $t('app_name'),
        'operatingSystem': 'Android',
        'applicationCategory': 'BookReaderApplication',
        'offers': {
          '@type': 'Offer',
          'price': 0,
          'priceCurrency': 'USD',
        },
        'installUrl': GOOGLE_PLAY_URL,
      },
      ]),
    },
  ],
})

const { isShowMaintenancePage } = useMaintenanceMode()

useColorModeSync()
</script>
