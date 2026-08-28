import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    include: ['test/unit/**/*.{test,spec}.ts'],
    environment: 'nuxt',
    environmentOptions: {
      // BASE_URL is unset under test, so pin it: middleware that derives the apex
      // host from it would otherwise no-op and let its assertions pass vacuously.
      // Set here rather than per-test: mocking useRuntimeConfig leaves the harness
      // without a router, and every test then fails on useRouter().afterEach.
      nuxt: {
        overrides: {
          runtimeConfig: { public: { baseURL: 'https://3ook.com' } },
        },
      },
    },
  },
})
