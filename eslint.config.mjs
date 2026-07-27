import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt({
  features: {
    stylistic: true,
  },
}).append({
  // Raw ES5 scripts inlined into <head> (see nuxt.config.ts). Optional catch
  // binding is ES2019, so these keep the unused binding on purpose.
  files: ['app/assets/js/**/*.js'],
  rules: {
    'no-unused-vars': ['error', { caughtErrors: 'none' }],
  },
})
