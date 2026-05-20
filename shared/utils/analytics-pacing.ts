import { WALL_CLOCK_JITTER_MS } from '~~/shared/constants/analytics'

export interface PacedDeltas {
  activeReadingTimeMsDelta: number
  ttsActiveTimeMsDelta: number
}

// The first-ever heartbeat for a user+book is unpaced — no prior reference to
// clamp against, so the request schema cap is the only bound.
export function clampPacedDeltas(
  requested: PacedDeltas,
  lastHeartbeatMs: number | null,
  now: number,
): PacedDeltas {
  const active = Math.max(0, requested.activeReadingTimeMsDelta)
  const tts = Math.max(0, requested.ttsActiveTimeMsDelta)
  if (lastHeartbeatMs === null) {
    return { activeReadingTimeMsDelta: active, ttsActiveTimeMsDelta: tts }
  }
  // Heartbeats aren't rate-limited, so a flat jitter allowance lets a scripted
  // client farm ~30s of credit per back-to-back beat. Bounding jitter by the
  // elapsed wall-clock caps total credit at ~2x the real elapsed time.
  const elapsed = Math.max(0, now - lastHeartbeatMs)
  const cap = elapsed + Math.min(WALL_CLOCK_JITTER_MS, elapsed)
  return {
    activeReadingTimeMsDelta: Math.min(active, cap),
    ttsActiveTimeMsDelta: Math.min(tts, cap),
  }
}
