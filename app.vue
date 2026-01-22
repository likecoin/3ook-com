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
import { useStorage } from '@vueuse/core'

const { t: $t } = useI18n()
const config = useRuntimeConfig()
const ogTitle = $t('app_title')
const ogDescription = $t('app_description')
const ogURL = config.public.baseURL
const ogImage = `${ogURL}/images/og/default.jpg`
const isTestnet = !!config.public.isTestnet

const { memberProgramData } = useMemberProgramStructuredData()

const { initializeServerGeolocation, initializeClientGeolocation } = useDetectedGeolocation()
const { initializePaymentCurrency } = usePaymentCurrency()
const { initializeLocale } = useAutoLocale()

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
const lastSessionRefreshTs = useStorage('lastSessionRefreshTs', 0)

onMounted(async () => {
  if (user.value) {
    const now = Date.now()
    const oneDayInMs = 24 * 60 * 60 * 1000
    const shouldRefresh = now - lastSessionRefreshTs.value > oneDayInMs

    if (shouldRefresh) {
      try {
        await accountStore.refreshSessionInfo()
        lastSessionRefreshTs.value = now
      }
      catch (error) {
        console.warn('Failed to refresh session info on app mount:', error)
      }
    }
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
    ...(i18nHead.value.link || []),
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify([{
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        'name': ogTitle,
        'description': ogDescription,
        'alternateName': ['3ook.com decentralized bookstore', 'Liker Land 電子書店', 'Liker Land'],
        'sameAs': [
          'https://linktr.ee/3ookcom',
          'https://www.instagram.com/3ookcom',
          'https://www.facebook.com/3ookcom',
          'https://review.3ook.com',
          'https://x.com/3ookcom',
          'https://www.threads.com/@3ookcom',
        ],
        'url': ogURL,
        'logo': ogImage,
        'brand': [
          {
            '@context': 'https://schema.org',
            '@type': 'Brand',
            'url': ogURL,
            'name': '3ook.com',
          },
        ],
        'hasMemberProgram': memberProgramData.value,
      }]),
    },
  ],
})

const { isShowMaintenancePage } = useMaintenanceMode()

useColorModeSync()
</script>
