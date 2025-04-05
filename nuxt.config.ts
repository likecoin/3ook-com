// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@wagmi/vue/nuxt',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@vueuse/nuxt',
    'nuxt-security',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ui: {
    colorMode: false,
  },
  runtimeConfig: {
    public: {
      likeCoinAPIEndpoint: process.env.LIKECOIN_API_ENDPOINT,
      likeCoinStaticEndpoint: process.env.LIKECOIN_STATIC_ENDPOINT,
      likeCoinChainAPIEndpoint: process.env.LIKECOIN_CHAIN_API_ENDPOINT,
      likerLandV2URL: process.env.LIKER_LAND_V2_URL,
      magicLinkAPIKey: process.env.MAGIC_LINK_API_KEY,
      magicLinkChainId: Number(process.env.MAGIC_LINK_CHAIN_ID) || 0,
      magicLinkCustomLogoURL: process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
      magicLinkRPCURL: process.env.MAGIC_LINK_RPC_URL,
      arweaveEndpoint: process.env.ARWEAVE_ENDPOINT,
      ipfsEndpoint: process.env.IPFS_ENDPOINT,
      pdfViewerOrigin: process.env.PDF_VIEWER_ORIGIN,
      pdfViewerURL: `${process.env.PDF_VIEWER_ORIGIN}${process.env.PDF_VIEWER_PATH}`,
    },
  },
  compatibilityDate: '2024-11-01',
  i18n: {
    locales: [
      {
        code: 'en',
        file: 'en.json',
        name: 'English',
      },
      {
        code: 'zh-Hant',
        file: 'zh-Hant.json',
        name: '中文',
      },
    ],
    lazy: true,
    defaultLocale: 'zh-Hant',
  },
  security: {
    headers: {
      contentSecurityPolicy: {
        'style-src': [
          '\'self\'',
          'blob:',
          '\'unsafe-inline\'',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
        ],
        'frame-src': [
          process.env.PDF_VIEWER_ORIGIN || '',
          'https://auth.magic.link',
        ],
        'base-uri': [
          '\'self\'',
        ],
        'img-src': [
          '\'self\'',
          'data:',
          'blob:',
          ...[
            process.env.LIKECOIN_API_ENDPOINT,
            process.env.LIKECOIN_STATIC_ENDPOINT,
            process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
          ].filter((url): url is string => Boolean(url)),
        ],
        'font-src': [
          '\'self\'',
          'blob:',
        ],
      },
      // NOTE: Allow Magic Link/PDF.js iframes
      crossOriginEmbedderPolicy: 'unsafe-none',
    },
  },
})
