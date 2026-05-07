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

const { t: $t } = useI18n()
const config = useRuntimeConfig()
const ogTitle = $t('app_title')
const ogDescription = $t('app_description')
const ogURL = config.public.baseURL
const ogImage = `${ogURL}/images/og/default.jpg`
const isTestnet = !!config.public.isTestnet
const likeCoinAPIEndpoint = config.public.likeCoinAPIEndpoint as string | undefined
const likeCoinStaticEndpoint = config.public.likeCoinStaticEndpoint as string | undefined
const posthogHost = config.public.posthogHost as string | undefined

const { memberProgramData } = useMemberProgramStructuredData()

const { initializeServerGeolocation, initializeClientGeolocation } = useDetectedGeolocation()
const { initializePaymentCurrency } = usePaymentCurrency()
const { initializeLocale } = useAutoLocale()
const { isApp } = useAppDetection()

callOnce(() => {
  initializeServerGeolocation()
})

onMounted(async () => {
  initializeClientGeolocation()
  await initializePaymentCurrency()
  await initializeLocale()
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
    maybeRefreshSession()
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
    ...(likeCoinAPIEndpoint
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
        '@type': 'OnlineStore',
        'name': ogTitle,
        'legalName': 'Liker Land, Inc.',
        'description': ogDescription,
        'alternateName': ['Liker Land 電子書店', 'Liker Land'],
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
        'email': 'cs@3ook.com',
        'contactPoint': [
          {
            '@type': 'ContactPoint',
            'contactType': 'customer service',
            'email': 'cs@3ook.com',
            'availableLanguage': ['English', 'Chinese'],
          },
          {
            '@type': 'ContactPoint',
            'contactType': 'customer service',
            'url': 'https://wa.me/15558049733',
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
        'name': '3ook.com',
        'operatingSystem': 'iOS',
        'applicationCategory': 'BookReaderApplication',
        'offers': {
          '@type': 'Offer',
          'price': 0,
          'priceCurrency': 'USD',
        },
        'installUrl': 'https://apps.apple.com/app/id6757783481',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        'name': '3ook.com',
        'operatingSystem': 'Android',
        'applicationCategory': 'BookReaderApplication',
        'offers': {
          '@type': 'Offer',
          'price': 0,
          'priceCurrency': 'USD',
        },
        'installUrl': 'https://play.google.com/store/apps/details?id=land.liker.book3app',
      },
      ]),
    },
  ],
})

const { isShowMaintenancePage } = useMaintenanceMode()

useColorModeSync()
</script>
