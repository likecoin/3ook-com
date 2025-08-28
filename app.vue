<template>
  <NuxtLoadingIndicator />
  <UApp>
    <NuxtLayout>
      <NuxtPage class="flex flex-col grow" />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const config = useRuntimeConfig()
const ogTitle = $t('app_title')
const ogDescription = $t('app_description')
const ogURL = config.public.baseURL
const ogImage = `${ogURL}/images/og/default.jpg`
const isTestnet = !!config.public.isTestnet

const i18nHead = useLocaleHead()
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
      name: 'theme-color',
      content: '#131313',
    },
  ],
  titleTemplate: title => title ? `${title} | ${$t('app_title')}` : $t('app_title'),
  link: [
    ...(i18nHead.value.link || []),
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    { rel: 'manifest', href: '/site.webmanifest' },
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
        ],
        'url': ogURL,
        'logo': ogImage,
        'brand': [
          {
            '@context': 'https://schema.org',
            '@type': 'Brand',
            'url': ogURL,
            'name': '3ook',
          },
        ],
      }]),
    },
  ],
})
</script>
