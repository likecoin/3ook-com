import { describe, expect, it } from 'vitest'
import { clampPacedDeltas } from '~~/shared/utils/analytics-pacing'
import { WALL_CLOCK_JITTER_MS } from '~~/shared/constants/analytics'

const NOW = 1_700_000_000_000

describe('clampPacedDeltas', () => {
  it('returns inputs as-is when no prior heartbeat exists', () => {
    expect(clampPacedDeltas(
      { activeReadingTimeMsDelta: 600_000, ttsActiveTimeMsDelta: 300_000 },
      null,
      NOW,
    )).toEqual({ activeReadingTimeMsDelta: 600_000, ttsActiveTimeMsDelta: 300_000 })
  })

  it('floors negative inputs at zero', () => {
    expect(clampPacedDeltas(
      { activeReadingTimeMsDelta: -5_000, ttsActiveTimeMsDelta: -1 },
      null,
      NOW,
    )).toEqual({ activeReadingTimeMsDelta: 0, ttsActiveTimeMsDelta: 0 })
  })

  it('clamps deltas to wall-clock elapsed plus full jitter when elapsed exceeds the jitter', () => {
    const elapsed = 60_000
    const lastHeartbeatMs = NOW - elapsed
    const result = clampPacedDeltas(
      { activeReadingTimeMsDelta: 600_000, ttsActiveTimeMsDelta: 600_000 },
      lastHeartbeatMs,
      NOW,
    )
    expect(result.activeReadingTimeMsDelta).toBe(elapsed + WALL_CLOCK_JITTER_MS)
    expect(result.ttsActiveTimeMsDelta).toBe(elapsed + WALL_CLOCK_JITTER_MS)
  })

  it('bounds jitter by the elapsed for near-instant beats so spam cannot farm credit', () => {
    // A scripted client firing heartbeats back-to-back sees ~0 elapsed; the
    // jitter must shrink with it rather than crediting a flat 30s per request.
    const elapsed = 50
    const result = clampPacedDeltas(
      { activeReadingTimeMsDelta: 600_000, ttsActiveTimeMsDelta: 600_000 },
      NOW - elapsed,
      NOW,
    )
    expect(result.activeReadingTimeMsDelta).toBe(elapsed * 2)
    expect(result.ttsActiveTimeMsDelta).toBe(elapsed * 2)
  })

  it('passes deltas through unchanged when they fit within the cap', () => {
    const lastHeartbeatMs = NOW - 10 * 60 * 1000
    expect(clampPacedDeltas(
      { activeReadingTimeMsDelta: 60_000, ttsActiveTimeMsDelta: 5_000 },
      lastHeartbeatMs,
      NOW,
    )).toEqual({ activeReadingTimeMsDelta: 60_000, ttsActiveTimeMsDelta: 5_000 })
  })

  it('clamps active and tts deltas independently', () => {
    const elapsed = 60_000
    const lastHeartbeatMs = NOW - elapsed
    const cap = elapsed + WALL_CLOCK_JITTER_MS
    const result = clampPacedDeltas(
      { activeReadingTimeMsDelta: 999_999, ttsActiveTimeMsDelta: 100 },
      lastHeartbeatMs,
      NOW,
    )
    expect(result.activeReadingTimeMsDelta).toBe(cap)
    expect(result.ttsActiveTimeMsDelta).toBe(100)
  })

  it('credits nothing for a future-dated lastHeartbeat (zero elapsed grants no jitter)', () => {
    const lastHeartbeatMs = NOW + 5_000
    const result = clampPacedDeltas(
      { activeReadingTimeMsDelta: 600_000, ttsActiveTimeMsDelta: 600_000 },
      lastHeartbeatMs,
      NOW,
    )
    expect(result.activeReadingTimeMsDelta).toBe(0)
    expect(result.ttsActiveTimeMsDelta).toBe(0)
  })

  it('returns zero deltas when both requested are zero', () => {
    expect(clampPacedDeltas(
      { activeReadingTimeMsDelta: 0, ttsActiveTimeMsDelta: 0 },
      NOW - 1_000,
      NOW,
    )).toEqual({ activeReadingTimeMsDelta: 0, ttsActiveTimeMsDelta: 0 })
  })
})
