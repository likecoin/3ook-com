// Workbox cache holding TTS segment audio. Shared with nuxt.config.ts, which
// declares the route, and with clearCaches, which must name it explicitly —
// Workbox cache names carry no cacheKeyPrefix, so a prefix purge misses them.
export const TTS_AUDIO_CACHE = 'tts-audio'
