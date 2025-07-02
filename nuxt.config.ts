// https://nuxt.com/docs/api/configuration/nuxt-config

const {
  GA_TRACKING_ID,
  AD_CONVERSION_ID,
  NODE_ENV,
} = process.env

const isDevelopment = NODE_ENV === 'development'

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
    'nuxt-svgo',
    'nuxt-gtag',
    '@sentry/nuxt/module',
    '@nuxt/scripts',
    '@nuxtjs/sitemap',
  ],

  devtools: { enabled: true },
  app: {
    layoutTransition: {
      name: 'fade',
      mode: 'out-in',
    },
  },
  css: ['~/assets/css/main.css'],
  site: {
    url: process.env.BASE_URL,
    name: '3ook.com',
  },

  ui: {
    colorMode: false,
  },

  runtimeConfig: {
    airtableAPISecret: process.env.AIRTABLE_API_SECRET,
    minimaxGroupId: process.env.MINIMAX_GROUP_ID,
    minimaxAPIKey: process.env.MINIMAX_API_KEY,
    public: {
      scripts: {
        crisp: {
          id: '',
        },
        metaPixel: {
          id: '',
        },
      },
      airtableCMSBaseId: process.env.AIRTABLE_CMS_BASE_ID,
      airtableCMSProductsTableId: process.env.AIRTABLE_CMS_PRODUCTS_TABLE_ID,
      airtableCMSTagsTableId: process.env.AIRTABLE_CMS_TAGS_TABLE_ID,
      googleAdConversionId: process.env.AD_CONVERSION_ID,
      likeCoinAPIEndpoint: process.env.LIKECOIN_API_ENDPOINT,
      likeCoinStaticEndpoint: process.env.LIKECOIN_STATIC_ENDPOINT,
      likeCoinEVMChainAPIEndpoint: process.env.LIKECOIN_EVM_CHAIN_API_ENDPOINT,
      likeCoinV3BookMigrationSiteURL: process.env.LIKECOIN_V3_BOOK_MIGRATION_SITE_URL,
      googleAnalyticsTrackingId: process.env.GA_TRACKING_ID,
      magicLinkAPIKey: process.env.MAGIC_LINK_API_KEY,
      magicLinkChainId: Number(process.env.MAGIC_LINK_CHAIN_ID) || 0,
      magicLinkCustomLogoURL: process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
      magicLinkRPCURL: process.env.MAGIC_LINK_RPC_URL,
      arweaveEndpoint: process.env.ARWEAVE_ENDPOINT,
      ipfsEndpoint: process.env.IPFS_ENDPOINT,
      isTestnet: process.env.IS_TESTNET,
      pdfViewerOrigin: process.env.PDF_VIEWER_ORIGIN,
      pdfViewerURL: `${process.env.PDF_VIEWER_ORIGIN}${process.env.PDF_VIEWER_PATH}`,
      sentryDsn: process.env.SENTRY_DSN,
      baseURL: process.env.BASE_URL,
    },
  },

  sourcemap: {
    client: 'hidden',
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-11-01',

  gtag: {
    tags: [
      GA_TRACKING_ID,
      AD_CONVERSION_ID,
    ].filter(Boolean).map(id => ({
      id: id?.split('/')[0] as string,
    })),
  },

  i18n: {
    baseUrl: process.env.BASE_URL,
    locales: [
      {
        code: 'en',
        file: 'en.json',
        name: 'English',
        language: 'en-US',
      },
      {
        code: 'zh-Hant',
        file: 'zh-Hant.json',
        name: '中文',
        language: 'zh-HK',
      },
    ],
    lazy: true,
    defaultLocale: 'zh-Hant',
    detectBrowserLanguage: false,
  },

  scripts: {
    registry: {
      crisp: true,
      metaPixel: true,
      stripe: true,
    },
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
          'https://client.crisp.chat',
        ],
        'frame-src': isDevelopment
          ? ['*']
          : [
              process.env.PDF_VIEWER_ORIGIN || '',
              'https://auth.magic.link',
              'https://js.stripe.com',
            ],
        'base-uri': [
          '\'self\'',
        ],
        'img-src': [
          '\'self\'',
          'data:',
          'blob:',
          'https://client.crisp.chat',
          'https://image.crisp.chat',
          'https://www.facebook.com',
          ...[
            process.env.LIKECOIN_API_ENDPOINT,
            process.env.LIKECOIN_STATIC_ENDPOINT,
            process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
          ].filter((url): url is string => Boolean(url)),
        ],
        'font-src': [
          '\'self\'',
          'blob:',
          'https://client.crisp.chat',
          'https://fonts.gstatic.com',
        ],
        // NOTE: Resolve Safari force HTTPS in development
        'upgrade-insecure-requests': isDevelopment ? false : true,
      },
      // NOTE: Allow Magic Link/PDF.js iframes
      crossOriginEmbedderPolicy: 'unsafe-none',
    },
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: 'likerland-team',
      project: '3ook-com',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
  },
  sitemap: {
    sources: [
      '/api/__sitemap__/store',
    ],
  },
})
