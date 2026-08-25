// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'node:fs'

import { createResolver } from '@nuxt/kit'
import type { NitroRouteConfig } from 'nitropack'
import type { ConfigDefaults } from 'posthog-js'

import { CUSTOMER_SERVICE_EMAIL } from './app/utils/business-info'
import { SERVER_CACHE_STORAGE } from './shared/constants/server-cache'
import {
  NFT_CLASS_ID_ROUTE_REGEX,
  STORE_PUBLISHER_ROUTE_PATH,
  getStorePublisherRouteName,
} from './shared/constants/store-routes'
import { TTS_AUDIO_CACHE } from './shared/constants/tts-cache'

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

// Read as raw text, not imported: this ES5 guard must reach the browser
// untranspiled and ahead of the module bundle, so browsers too old to run the
// app still get a readable message. See the file header for the rationale.
const BROWSER_SUPPORT_CHECK_PATH = 'app/assets/js/browser-support-check.js'
const BROWSER_SUPPORT_CHECK_SCRIPT = readFileSync(
  resolve(BROWSER_SUPPORT_CHECK_PATH),
  'utf8',
)
  .replace('__3OOK_COMMIT_SHA__', process.env.COMMIT_SHA || 'dev')
  .replace('__3OOK_SUPPORT_EMAIL__', CUSTOMER_SERVICE_EMAIL)

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
    head: {
      script: [
        // First script in <head> on purpose — it must run before the bundle.
        // nuxt-security's SSR plugin stamps the CSP nonce onto it.
        {
          innerHTML: BROWSER_SUPPORT_CHECK_SCRIPT,
          tagPriority: -100,
        },
      ],
    },
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
          civicMonthly: {
            original: 99.99,
            actual: 99.99,
          },
          civicYearly: {
            original: 999.99,
            actual: 999.99,
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

  // readFileSync creates no module edge for the config watcher, so without this
  // dev never picks up edits to the guard.
  watch: [BROWSER_SUPPORT_CHECK_PATH],

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    clientNodeCompat: true,
  },

  compatibilityDate: '2024-11-01',

  nitro: {
    // An unmounted base falls back to the memory driver, which silently drops
    // per-call ttls and never evicts. One mount per TTL, defined alongside the
    // constants the server code reads.
    storage: SERVER_CACHE_STORAGE,
  },

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
    // /library reuses the store pages (same files), distinguished by route name.
    // It surfaces only Plus-reading books; see app/pages/store/index.vue.
    'pages:extend'(pages) {
      // Branded publisher storefront at /<tab>/@<likerId>. Declared here rather
      // than as a page file so both tabs share one component.
      const getPublisherRoute = (listingRouteName: string) => ({
        name: getStorePublisherRouteName(listingRouteName),
        path: STORE_PUBLISHER_ROUTE_PATH,
        file: resolve('app/pages/store/index.vue'),
      })

      const storePage = pages.find(page => page.path === '/store')
      if (!storePage?.children) {
        throw new Error('[pages:extend] /store page tree not found; the publisher storefront route cannot be registered')
      }
      // Unshifted so it reads ahead of the :nftClassId sibling.
      storePage.children.unshift(getPublisherRoute('store'))

      // The listing takes /<tab>/<tagId> via an optional param
      // NFT Class IDs always start with 0x, so the regex below sends /<tab>/0x… to the product page
      // (vue-router ranks a regex param above the plain :tagId?).
      const listingRoute = storePage.children.find(child => child.name === 'store')
      const productRoutes = storePage.children.filter(child => child.path.includes(':nftClassId'))
      if (!listingRoute || !productRoutes.length) {
        throw new Error('[pages:extend] /store listing or product route not found; the tag path cannot be registered')
      }
      listingRoute.path = ':tagId?'
      for (const child of productRoutes) {
        // The scanner formats dynamic params as ':nftClassId()'; tolerate both forms.
        child.path = child.path.replace(/:nftClassId(\(\))?/, `:nftClassId(${NFT_CLASS_ID_ROUTE_REGEX})`)
      }

      pages.push({
        path: '/library',
        file: resolve('app/pages/store.vue'),
        children: [
          {
            name: 'library',
            path: ':tagId?',
            file: resolve('app/pages/store/index.vue'),
          },
          getPublisherRoute('library'),
          {
            name: 'library-nftClassId',
            path: `:nftClassId(${NFT_CLASS_ID_ROUTE_REGEX})`,
            file: resolve('app/pages/store/[nftClassId]/index.vue'),
          },
        ],
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
    // Inline the custom SVGs into the client bundle. Without this, Nuxt Icon
    // fetches the collection at runtime from /api/_nuxt_icon/3ook-com.json on
    // first paint, so a dropped connection throws and the tab bar icons vanish.
    clientBundle: { includeCustomCollections: true },
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
          // The app manifest getAppManifest() fetches, keyed by build id and so
          // immutable like the assets below — but it needs its own cache: it used
          // to share theirs, where Nuxt's cache-busted builds/latest.json poll
          // churns a unique entry per hour and can evict it. Losing it is a
          // [NUXT_E5002] on the next offline boot.
          urlPattern: ({ url }) => url.pathname.startsWith('/_nuxt/builds/meta/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'nuxt-build-manifest',
            expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          // Content-hashed build assets are immutable: cache on first request so
          // the SPA's JS/CSS is available offline after a single online visit.
          // /_nuxt/builds/ is excluded: latest.json carries a `?<timestamp>`, so
          // caching it can never produce a hit, only evictions.
          urlPattern: ({ url }) => url.pathname.startsWith('/_nuxt/') && !url.pathname.startsWith('/_nuxt/builds/'),
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
          // TTS segment audio, immutable for a given (text, voice, language), so
          // CacheFirst spares re-listens and seek-backs a refetch. ~30KB a
          // segment, so 1500 entries is ~45MB against the 500MB book budget.
          urlPattern: ({ url }) => url.pathname === '/api/reader/tts',
          handler: 'CacheFirst',
          options: {
            cacheName: TTS_AUDIO_CACHE,
            // <audio> seeks with Range requests. Workbox stores the full 200 and
            // synthesises 206s from it, so a seek-back never refetches.
            rangeRequests: true,
            // Edge copies minted before this deploy still carry `vary: Range`
            // under a week-long max-age, and would never match again.
            matchOptions: { ignoreVary: true },
            expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            // Never store a 206 — RangeRequestsPlugin needs a complete body to
            // slice, and a partial one would be served as if it were whole.
            cacheableResponse: { statuses: [200] },
            plugins: [
              {
                // Warming fetches ask for blocking=1 and playback does not; the
                // bytes are identical, so drop it or the two never share an entry.
                cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
                  const url = new URL(request.url)
                  url.searchParams.delete('blocking')
                  // A Request, not a string: Workbox wraps a string in a
                  // header-less one, hiding Range from RangeRequestsPlugin.
                  return new Request(url.href, request)
                },
              },
            ],
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
                handlerDidError: async ({ request }) => {
                  // Inline the cache names and breadcrumb URL: this handler is
                  // serialized into the generated sw.js via toString(), so no
                  // module-scope closure is in scope at runtime — one throws.
                  // Storage pressure can reject the reads below just as it can
                  // empty the cache; treat a throw as nothing cached so the
                  // retry rung — which needs no storage — still runs.
                  let cache: Cache | undefined
                  let keys: readonly Request[] = []
                  try {
                    cache = await caches.open('html-pages')
                    // ignoreSearch: the homepage is often cached with UTM query
                    // params (query.global middleware), so a bare '/' would miss.
                    const shell = await cache.match('/', { ignoreSearch: true })
                    if (shell) return shell
                    keys = await cache.keys()
                    const firstKey = keys[0]
                    const fallback = firstKey ? await cache.match(firstKey) : undefined
                    if (fallback) return fallback
                  }
                  catch {
                    // Fall through to the retry rung.
                  }

                  // Nothing cached. Almost all of these report the device as
                  // online, so the 10s NetworkFirst race likely abandoned a
                  // response that would still have arrived — retry it. The
                  // worker can't reach PostHog, so leave a breadcrumb instead
                  // for utils/sw-dead-end to report on the next boot.
                  const at = Date.now()
                  const writeCrumb = async (retry: string) => {
                    try {
                      const diagnostics = await caches.open('sw-diagnostics')
                      await diagnostics.put('/__sw_dead_end', new Response(JSON.stringify({
                        at,
                        wasOnline: navigator.onLine,
                        cacheKeysCount: keys.length,
                        pathname: new URL(request.url).pathname,
                        retry,
                      })))
                    }
                    catch {
                      // Storage full or evicted — best effort.
                    }
                  }
                  // AbortController, not AbortSignal.timeout: the latter needs
                  // iOS 16+ inside a service worker, and this rung has to
                  // survive the oldest WebKit we serve. 20s doubles the budget
                  // NetworkFirst already spent.
                  const controller = new AbortController()
                  const timer = setTimeout(() => controller.abort(), 20000)
                  try {
                    const response = await fetch(request, { signal: controller.signal })
                    const isCacheable = response.status === 200
                    // Repair the empty cache so a repeat offender takes the
                    // shell rung next time. Swallows its own rejection: a quota
                    // failure must not sink the response the retry just won.
                    await Promise.all([
                      writeCrumb(isCacheable ? 'ok' : `status_${response.status}`),
                      isCacheable && cache ? cache.put(request, response.clone()).catch(() => {}) : undefined,
                    ])
                    return response
                  }
                  catch {
                    await writeCrumb('failed')
                    return Response.error()
                  }
                  finally {
                    clearTimeout(timer)
                  }
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
    // Off on purpose: `true` strips via vite.esbuild.drop, which Vite 8 discards
    // for oxc, and the object form reprints files behind an identity sourcemap,
    // which would misplace every Sentry stack trace. No app code logs today.
    removeLoggers: false,
    headers: {
      contentSecurityPolicy: {
        // Vite injects its dev client and entry chunk without a CSP nonce, and
        // 'strict-dynamic' voids the host allowlist, so both get blocked.
        // Production keeps nuxt-security's nonce + strict-dynamic default.
        ...(isDevelopment
          ? {
              'script-src': [
                '\'self\'',
                'https:',
                '\'unsafe-inline\'',
                '\'unsafe-eval\'',
                'blob:',
              ],
            }
          : {}),
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
    telemetry: false,
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
