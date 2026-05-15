// Wire contract for the per-request TTS source marker. The server emits it as
// a Server-Timing header on /api/reader/tts; the client reads it back via
// PerformanceResourceTiming.serverTiming on the tts_segment_loaded event. Both
// sides MUST go through these symbols — a mismatch degrades silently to an
// 'unknown' classification with no error.
export const TTS_SERVER_TIMING_METRIC = 'tts'

export const TTS_SERVER_SOURCE = {
  GENERATED: 'gen',
  STORED: 'store',
} as const

export type TTSServerSource = typeof TTS_SERVER_SOURCE[keyof typeof TTS_SERVER_SOURCE]

export function buildTTSServerTiming(source: TTSServerSource): string {
  return `${TTS_SERVER_TIMING_METRIC};desc="${source}"`
}
