// https://nuxt.com/docs/api/configuration/nuxt-config
import { createResolver } from '@nuxt/kit'
import type { NitroRouteConfig } from 'nitropack'
import type { ConfigDefaults } from 'posthog-js'

const { resolve } = createResolver(import.meta.url)

const {
  NODE_ENV,
  POSTHOG_PUBLIC_KEY,
  POSTHOG_HOST,
  POSTHOG_DEFAULTS,
} = process.env

const isDevelopment = NODE_ENV === 'development'

// Workbox cacheName for document navigations; shared so the offline app-shell
// fallback below opens the same cache the NetworkFirst route writes to.
const HTML_PAGES_CACHE = 'html-pages'

// Shared CORS rule for public store API routes consumed by *.3ook.com origins.
const STORE_API_CORS_RULE: NitroRouteConfig = {
  security: {
    corsHandler: {
      origin: '^https?:\\/\\/([a-zA-Z0-9-]+\\.)?3ook\\.com$',
      useRegExp: true,
      methods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    },
  },
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@wagmi/vue/nuxt',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    'nuxt-auth-utils',
    '@vueuse/nuxt',
    'nuxt-security',
    'nuxt-svgo',
    '@sentry/nuxt/module',
    '@nuxt/scripts',
    '@nuxtjs/sitemap',
    '@likecoin/v-gsap-nuxt',
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
    // Secrets: left empty so none are baked into the build output. Nitro fills them
    // at runtime from the matching NUXT_-prefixed env var (NUXT_AIRTABLE_API_SECRET,
    // etc.), which is what lets apphosting.*.yaml scope them to RUNTIME only.
    airtableAPISecret: '',
    plusReadingServiceToken: '',
    minimaxGroupId: '',
    minimaxAPIKey: '',
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
      likeCoinCollectiveAddress: process.env.LIKECOIN_COLLECTIVE_ADDRESS,
      likeCoinStakePositionAddress: process.env.LIKECOIN_STAKE_POSITION_ADDRESS,
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
    '/api/store/products': STORE_API_CORS_RULE,
    '/api/store/products/**': STORE_API_CORS_RULE,
    '/api/store/tags': STORE_API_CORS_RULE,
    '/api/store/tags/**': STORE_API_CORS_RULE,
    '/api/store/staking-books': STORE_API_CORS_RULE,
    // Custom-voice uploads bundle audio (≤20MB) + prompt (≤2MB) + avatar (≤2MB).
    '/api/user/custom-voice': {
      security: {
        requestSizeLimiter: {
          maxUploadFileRequestInBytes: 28 * 1024 * 1024,
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

  hooks: {
    // /library reuses the store page (same file), distinguished by route name.
    // It surfaces only Plus-reading books; see app/pages/store/index.vue.
    'pages:extend'(pages) {
      pages.push({
        name: 'library',
        path: '/library',
        file: resolve('app/pages/store/index.vue'),
      })
      pages.push({
        name: 'library-nftClassId',
        path: '/library/:nftClassId',
        file: resolve('app/pages/store/[nftClassId]/index.vue'),
      })
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
    defaultLocale: 'zh-Hant',
    detectBrowserLanguage: false,
    experimental: {
      // Cache the messages route for 1 day (default is 10s) so browsers and the
      // CDN reuse unchanged translations. Safe: the route URL is content-hashed.
      httpCacheDuration: 60 * 60 * 24,
    },
  },

  icon: {
    // Local SVG collection for bespoke icons not in Material Symbols.
    // Reference as `i-3ook-com-<filename>` (e.g. i-3ook-com-library-rounded).
    customCollections: [
      { prefix: '3ook-com', dir: resolve('app/assets/icons') },
    ],
  },

  pwa: {
    registerType: 'autoUpdate',
    // Serve sw.js and manifest.webmanifest with 'max-age=0, must-revalidate' so
    // a stale CDN/edge copy can't pin the old worker and block autoUpdate; they
    // revalidate cheaply via ETag (304). Without this the worker never updates.
    registerWebManifestInRouteRules: true,
    workbox: {
      // Under SSR there is no static index.html for Workbox to precache, so
      // vite-plugin-pwa's default `navigateFallback: '/'` resolves to a URL that
      // is never in the precache. Offline navigations then throw
      // `non-precached-url` and render blank (the iOS/Android WebView symptom).
      // Disable it; the NetworkFirst route below serves the last-seen document
      // offline so the real app boots and its own offline handling takes over.
      navigateFallback: undefined,
      runtimeCaching: [
        {
          // Content-hashed build assets are immutable: cache on first request so
          // the SPA's JS/CSS is available offline after a single online visit.
          urlPattern: ({ url }) => url.pathname.startsWith('/_nuxt/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'nuxt-build-assets',
            expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // @nuxtjs/i18n strips unused keys from the SSR payload and fetches the
          // full locale from this Nitro route at runtime; without caching it,
          // offline navigations render raw keys. The :hash makes CacheFirst safe.
          urlPattern: ({ url }) => url.pathname.startsWith('/_i18n/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'i18n-messages',
            expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Page navigations: prefer fresh network, fall back to the last cached
          // document when offline so the app shell can boot. Skip API routes —
          // they must never be served from a stale document cache.
          urlPattern: ({ request, url }) =>
            request.mode === 'navigate' && !url.pathname.startsWith('/api'),
          handler: 'NetworkFirst',
          options: {
            cacheName: HTML_PAGES_CACHE,
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [200] },
            plugins: [
              {
                // A direct offline open of an SPA sub-route (e.g. /shelf) has no
                // cached document — client-side navigations never hit the SW — so
                // NetworkFirst throws `no-response`. Serve any cached document as
                // the shell; Nuxt boots and routes to the real URL client-side.
                handlerDidError: async () => {
                  // Inline the cache name: this handler is serialized into the
                  // generated sw.js via toString(), so the HTML_PAGES_CACHE
                  // closure isn't in scope at runtime — referencing it throws.
                  const cache = await caches.open('html-pages')
                  // ignoreSearch: the homepage is often cached with UTM query
                  // params (query.global middleware), so a bare '/' would miss.
                  const shell = await cache.match('/', { ignoreSearch: true })
                  if (shell) return shell
                  const [firstKey] = await cache.keys()
                  const fallback = firstKey ? await cache.match(firstKey) : undefined
                  return fallback ?? Response.error()
                },
              },
            ],
          },
        },
      ],
    },
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
      googleAnalytics: {
        bundle: false,
        proxy: false,
      },
      metaPixel: {
        bundle: false,
        proxy: false,
      },
      posthog: POSTHOG_PUBLIC_KEY
        ? {
            trigger: 'onNuxtReady',
            apiKey: POSTHOG_PUBLIC_KEY,
            apiHost: POSTHOG_HOST,
            config: {
              defaults: POSTHOG_DEFAULTS as ConfigDefaults | undefined,
              person_profiles: 'identified_only',
              capture_exceptions: { capture_console_errors: true },
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
              'https://www.facebook.com',
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
