// https://nuxt.com/docs/api/configuration/nuxt-config
import type { ConfigDefaults } from 'posthog-js'

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
    'v-gsap-nuxt',
    '@vite-pwa/nuxt',
    '@posthog/nuxt',
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
    azureSubscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY,
    azureServiceRegion: process.env.AZURE_SERVICE_REGION || 'southeastasia',
    ttsCacheBucketPrefix: process.env.TTS_CACHE_BUCKET_PREFIX,
    public: {
      scripts: {
        intercom: {
          app_id: '',
        },
        metaPixel: {
          id: '',
        },
      },
      uetTagId: process.env.UET_TAG_ID,
      airtableCMSBaseId: process.env.AIRTABLE_CMS_BASE_ID,
      airtableCMSProductsTableId: process.env.AIRTABLE_CMS_PRODUCTS_TABLE_ID,
      airtableCMSPublicationsTableId: process.env.AIRTABLE_CMS_PUBLICATIONS_TABLE_ID,
      airtableCMSTagsTableId: process.env.AIRTABLE_CMS_TAGS_TABLE_ID,
      cacheKeyPrefix: '3ook',
      googleAdConversionId: process.env.AD_CONVERSION_ID,
      likeCoinAPIEndpoint: process.env.LIKECOIN_API_ENDPOINT,
      likeCoinStaticEndpoint: process.env.LIKECOIN_STATIC_ENDPOINT,
      likeCoinEVMChainAPIEndpoint: process.env.LIKECOIN_EVM_CHAIN_API_ENDPOINT,
      likeCoinEVMChainCollectiveAPIEndpoint: process.env.LIKECOIN_EVM_CHAIN_COLLECTIVE_API_ENDPOINT,
      likeCoinTokenAddress: process.env.LIKECOIN_TOKEN_ADDRESS,
      likeCoinTokenDecimals: Number(process.env.LIKECOIN_TOKEN_DECIMALS),
      likeCoinTokenSymbol: process.env.LIKECOIN_TOKEN_SYMBOL,
      likeCoinVeTokenAddress: process.env.LIKECOIN_VE_TOKEN_ADDRESS,
      likeCoinVeTokenSymbol: process.env.LIKECOIN_VE_TOKEN_SYMBOL,
      likeCoinV3BookMigrationSiteURL: process.env.LIKECOIN_V3_BOOK_MIGRATION_SITE_URL,
      likerLandSiteURL: process.env.LIKER_LAND_SITE_URL,
      googleAnalyticsTrackingId: process.env.GA_TRACKING_ID,
      magicLinkAPIKey: process.env.MAGIC_LINK_API_KEY,
      magicLinkCustomLogoURL: process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
      walletConnectProjectId: process.env.WALLET_CONNECT_PROJECT_ID,
      arweaveEndpoint: process.env.ARWEAVE_ENDPOINT,
      ipfsEndpoint: process.env.IPFS_ENDPOINT,
      isMaintenanceMode: process.env.IS_MAINTENANCE_MODE !== undefined,
      isTestnet: process.env.IS_TESTNET,
      pdfViewerOrigin: process.env.PDF_VIEWER_ORIGIN,
      pdfViewerURL: `${process.env.PDF_VIEWER_ORIGIN}${process.env.PDF_VIEWER_PATH}`,
      posthogPublicKey: process.env.POSTHOG_PUBLIC_KEY,
      posthogHost: process.env.POSTHOG_HOST,
      posthogDefaults: process.env.POSTHOG_DEFAULTS,
      publishBookEndpoint: process.env.PUBLISH_BOOK_ENDPOINT,
      sentryDsn: process.env.SENTRY_DSN,
      subscription: {
        pricing: {
          monthly: {
            original: 9.99,
            actual: 9.99,
          },
          yearly: {
            original: 99.99,
            actual: 99.99,
          },
        },
      },
      baseURL: process.env.BASE_URL,
    },
    session: {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      cookie: {
        secure: !isDevelopment,
      },
    },
  },

  routeRules: {
    '/api/store/products': {
      security: {
        corsHandler: {
          origin: '^https?:\\/\\/([a-zA-Z0-9-]+\\.)?3ook\\.com$',
          useRegExp: true,
          methods: ['GET', 'OPTIONS'],
          allowHeaders: ['Content-Type', 'Authorization'],
        },
      },
    },
    '/api/store/tags': {
      security: {
        corsHandler: {
          origin: '^https?:\\/\\/([a-zA-Z0-9-]+\\.)?3ook\\.com$',
          useRegExp: true,
          methods: ['GET', 'OPTIONS'],
          allowHeaders: ['Content-Type', 'Authorization'],
        },
      },
    },
  },

  sourcemap: {
    client: 'hidden',
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    clientNodeCompat: true,
  },

  compatibilityDate: '2024-11-01',

  vite: {
    optimizeDeps: {
      exclude: ['@resvg/resvg-wasm'],
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
    define: {
      __SENTRY_DEBUG__: false,
      __SENTRY_TRACING__: false,
    },
  },

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

  posthogConfig: {
    publicKey: process.env.POSTHOG_PUBLIC_KEY || 'placeholder_key_to_avoid_nuxt_module_error',
    host: process.env.POSTHOG_HOST,
    clientConfig: {
      defaults: process.env.POSTHOG_DEFAULTS as ConfigDefaults | undefined,
      person_profiles: 'identified_only',
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '3ook.com',
      short_name: '3ook.com',
      description: 'AI reading companion & decentralized bookstore',
      theme_color: '#131313',
      background_color: '#f9f9f9',
      orientation: 'portrait',
      display: 'standalone',
    },
    pwaAssets: {
      config: true,
      overrideManifestIcons: true,
    },
  },

  scripts: {
    registry: {
      intercom: true,
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
        ],
        'frame-src': isDevelopment
          ? ['*']
          : [
              process.env.PDF_VIEWER_ORIGIN || '',
              'https://auth.magic.link',
              'https://js.stripe.com',
              'https://td.doubleclick.net',
              'https://www.googletagmanager.com',
              'https://www.facebook.com',
              'https://verify.walletconnect.org',
            ],
        'base-uri': [
          '\'self\'',
        ],
        'img-src': [
          '\'self\'',
          'data:',
          'blob:',
          'https://www.facebook.com',
          'https://connect.facebook.net',
          'https://www.google.com',
          'https://js.intercomcdn.com',
          'https://downloads.intercomcdn.com',
          'https://static.intercomassets.com',
          'https://explorer-api.walletconnect.com',
          'https://bat.bing.com',
          'https://bat.bing.net',
          ...[
            process.env.LIKECOIN_API_ENDPOINT,
            process.env.LIKECOIN_STATIC_ENDPOINT,
            process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
          ].filter((url): url is string => Boolean(url)),
        ],
        'font-src': [
          '\'self\'',
          'blob:',
          'https://fonts.gstatic.com',
          'https://fonts.intercomcdn.com',
        ],
        'form-action': [
          '\'self\'',
          'https://www.facebook.com',
        ],
        'frame-ancestors': [
          '\'self\'',
          'base.org',
          '*.base.org',
          'base.app',
          '*.base.app',
          'base.dev',
          '*.base.dev',
          'farcaster.xyz',
          '*.farcaster.xyz',
        ],
        // NOTE: Resolve Safari force HTTPS in development
        'upgrade-insecure-requests': isDevelopment ? false : true,
      },
      // NOTE: Allow Magic Link/PDF.js iframes
      crossOriginEmbedderPolicy: 'unsafe-none',
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
    },
    rateLimiter: false,
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
