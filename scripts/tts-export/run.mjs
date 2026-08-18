#!/usr/bin/env node
/**
 * Server modules reference Nitro auto-imports as free identifiers, which jiti
 * leaves unresolved — so they fall through to the globals defined below and
 * load unmodified. That is what lets this script run production's own
 * synthesis and cache-key code instead of a copy that could drift from it.
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createJiti } from 'jiti'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

globalThis.useRuntimeConfig = () => ({
  minimaxAPIKey: process.env.NUXT_MINIMAX_API_KEY,
  minimaxGroupId: process.env.NUXT_MINIMAX_GROUP_ID,
  ttsCacheBucketPrefix: process.env.TTS_CACHE_BUCKET_PREFIX,
})
globalThis.createError = options => Object.assign(
  new Error(options?.message || options?.statusMessage || 'Error'),
  options,
)

const jiti = createJiti(import.meta.url, {
  alias: { '~~': root, '~': `${root}/app` },
})

const { main } = await jiti.import(`${root}/scripts/tts-export/index.ts`)
await main(process.argv.slice(2))
