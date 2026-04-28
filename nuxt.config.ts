// https://nuxt.com/docs/api/configuration/nuxt-config
import type { ConfigDefaults } from 'posthog-js'

const {
  NODE_ENV,
  POSTHOG_PUBLIC_KEY,
  POSTHOG_HOST,
  POSTHOG_DEFAULTS,
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
    '@sentry/nuxt/module',
    '@nuxt/scripts',
    '@nuxtjs/sitemap',
    'v-gsap-nuxt',
    '@vite-pwa/nuxt',
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

  colorMode: {
    preference: 'light',
    fallback: 'light',
    storageKey: '3ook-com-color-mode',
  },

  ui: {
    colorMode: true,
  },

  runtimeConfig: {
    pubsubEnable: process.env.GCLOUD_PUBSUB_ENABLE || '',
    appServer: process.env.APP_SERVER || '3ook-web',
    airtableAPISecret: process.env.AIRTABLE_API_SECRET,
    minimaxGroupId: process.env.MINIMAX_GROUP_ID,
    minimaxAPIKey: process.env.MINIMAX_API_KEY,
    ttsCacheBucketPrefix: process.env.TTS_CACHE_BUCKET_PREFIX,
    customVoiceBucketPrefix: process.env.CUSTOM_VOICE_BUCKET_PREFIX,
    uploadedBooksBucketPrefix: process.env.UPLOADED_BOOKS_BUCKET_PREFIX,
    public: {
      scripts: {
        googleAnalytics: {
          id: process.env.GA_TRACKING_ID || '',
        },
        intercom: {
          app_id: '',
        },
        metaPixel: {
          id: '',
        },
      },
      airtableCMSBaseId: process.env.AIRTABLE_CMS_BASE_ID,
      airtableCMSProductsTableId: process.env.AIRTABLE_CMS_PRODUCTS_TABLE_ID,
      airtableCMSPublicationsTableId: process.env.AIRTABLE_CMS_PUBLICATIONS_TABLE_ID,
      airtableCMSTagsTableId: process.env.AIRTABLE_CMS_TAGS_TABLE_ID,
      alchemyGasPolicyId: process.env.ALCHEMY_GAS_POLICY_ID,
      cacheKeyPrefix: '3ook',
      commitSHA: process.env.COMMIT_SHA,
      customRpcUrl: process.env.CUSTOM_RPC_URL,
      likeCoinAPIEndpoint: process.env.LIKECOIN_API_ENDPOINT,
      likeCoinStaticEndpoint: process.env.LIKECOIN_STATIC_ENDPOINT,
      likeCoinEVMChainAPIEndpoint: process.env.LIKECOIN_EVM_CHAIN_API_ENDPOINT,
      likeCoinEVMChainCollectiveAPIEndpoint: process.env.LIKECOIN_EVM_CHAIN_COLLECTIVE_API_ENDPOINT,
      likeCoinTokenAddress: process.env.LIKECOIN_TOKEN_ADDRESS,
      likeCoinTokenDecimals: Number(process.env.LIKECOIN_TOKEN_DECIMALS),
      likeCoinTokenSymbol: process.env.LIKECOIN_TOKEN_SYMBOL,
      likeCoinVeTokenAddress: process.env.LIKECOIN_VE_TOKEN_ADDRESS,
      likeCoinVeTokenSymbol: process.env.LIKECOIN_VE_TOKEN_SYMBOL,
      likeCoinVeLikeLegacyRewardAddresses: process.env.LIKECOIN_VE_LIKE_LEGACY_REWARD_ADDRESSES,
      likeCoinV3BookMigrationSiteURL: process.env.LIKECOIN_V3_BOOK_MIGRATION_SITE_URL,
      likerLandSiteURL: process.env.LIKER_LAND_SITE_URL,
      magicLinkAPIKey: process.env.MAGIC_LINK_API_KEY,
      magicLinkCustomLogoURL: process.env.MAGIC_LINK_CUSTOM_LOGO_URL,
      walletConnectProjectId: process.env.WALLET_CONNECT_PROJECT_ID,
      arweaveEndpoint: process.env.ARWEAVE_ENDPOINT,
      ipfsEndpoint: process.env.IPFS_ENDPOINT,
      isMaintenanceMode: process.env.IS_MAINTENANCE_MODE !== undefined,
      isTestnet: process.env.IS_TESTNET,
      posthogHost: process.env.POSTHOG_HOST,
      publishBookEndpoint: process.env.PUBLISH_BOOK_ENDPOINT,
      sentryDsn: process.env.SENTRY_DSN,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
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
    '/.well-known/apple-app-site-association': {
      headers: { 'Content-Type': 'application/json' },
    },
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

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '3ook.com',
      short_name: '3ook.com',
      description: 'Read, Listen, Own — 3rd-gen decentralized bookstore',
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
    privacy: false,
    registry: {
      googleAnalytics: true,
      intercom: {
        trigger: { idleTimeout: 3000 },
      },
      metaPixel: true,
      posthog: POSTHOG_PUBLIC_KEY
        ? {
            trigger: 'onNuxtReady',
            apiKey: POSTHOG_PUBLIC_KEY,
            apiHost: POSTHOG_HOST,
            config: {
              defaults: POSTHOG_DEFAULTS as ConfigDefaults | undefined,
              person_profiles: 'identified_only',
            },
          }
        : undefined,
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
              '\'self\'',
              'https://auth.magic.link',
              'https://checkout.stripe.com',
              'https://js.stripe.com',
              'https://td.doubleclick.net',
              'https://www.googletagmanager.com',
              'https://verify.walletconnect.com',
              'https://verify.walletconnect.org',
              'https://secure.walletconnect.com',
              'https://secure.walletconnect.org',
              'https://www.youtube-nocookie.com',
              'https://www.youtube.com',
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
          'https://i.ytimg.com',
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
          'https://fonts.reown.com',
        ],
        'form-action': [
          '\'self\'',
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
      // NOTE: Allow Magic Link iframes
      crossOriginEmbedderPolicy: 'unsafe-none',
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        microphone: ['self'],
      },
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
