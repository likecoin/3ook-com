<template>
  <NuxtLoadingIndicator />
  <UApp>
    <NuxtLayout>
      <NuxtPage class="grow flex flex-col" />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { t: $t } = useI18n()
const config = useRuntimeConfig()
const ogTitle = $t('app_title')
const ogDescription = $t('app_description')

useHead({
  meta: [
    {
      name: 'viewport',
      content:
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    },
    {
      name: 'description',
      content: ogDescription,
    },
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
      content: `${config.public.baseURL}/images/og/default.jpg`,
    },
    {
      name: 'theme-color',
      content: '#131313',
    },
  ],
  titleTemplate: title => title ? `${title} | ${$t('app_title')}` : $t('app_title'),
  link: [
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
})
</script>
