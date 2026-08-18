import { describe, expect, it } from 'vitest'
import { getWarmRunwayFrom } from '~/utils/tts-warm-runway'

// Matches TTS_MIN_WARM_RUNWAY in use-text-to-speech: below this a dropout is
// surfaced rather than ridden out.
const MIN_WARM_RUNWAY = 3

describe('getWarmRunwayFrom', () => {
  it('counts the reported index from the playhead', () => {
    expect(getWarmRunwayFrom(30, 10)).toBe(20)
  })

  it('is zero when nothing past the playhead is warm', () => {
    expect(getWarmRunwayFrom(10, 10)).toBe(0)
  })

  it('never goes negative when a report lags behind the playhead', () => {
    // The native shell's reports are dropped while the WebView is suspended, so
    // warmedThrough can be older than the playhead. Stale reads as no runway.
    expect(getWarmRunwayFrom(30, 40)).toBe(0)
  })

  it('is zero before either player has warmed anything', () => {
    // Both players initialise warmedThrough to -1.
    expect(getWarmRunwayFrom(-1, 0)).toBe(0)
  })

  it('holds the gate shut while only the N+1 lookahead is warm', () => {
    // The bug this replaced: the native player returned the depth it had
    // requested, clearing the gate on the first boundary with nothing on disk.
    expect(getWarmRunwayFrom(6, 5)).toBeLessThan(MIN_WARM_RUNWAY)
  })

  it('opens the gate once a real runway is warm', () => {
    expect(getWarmRunwayFrom(25, 5)).toBeGreaterThanOrEqual(MIN_WARM_RUNWAY)
  })
})
