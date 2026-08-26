import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  classifyTTSAudioSource,
  classifyTTSCacheStatus,
  clearTTSWarmedSegments,
  markTTSSegmentWarmed,
} from '~/utils/resource-timing'

const PLAYED_URL = '/api/reader/tts?text=hi&voice_id=male-1'
const WARMED_URL = '/api/reader/tts?text=hi&voice_id=male-1&blocking=1'

// A worker-served reply reports no timing at all, which is what pushes the
// classifiers onto the branch the warmed registry answers.
function stubResourceEntry(entry?: Partial<PerformanceResourceTiming>) {
  vi.spyOn(performance, 'getEntriesByName').mockReturnValue(entry ? [entry as PerformanceResourceTiming] : [])
}

afterEach(() => {
  clearTTSWarmedSegments()
  vi.restoreAllMocks()
})

describe('classifyTTSCacheStatus', () => {
  it('reports unknown when nothing warmed the segment', () => {
    stubResourceEntry()
    expect(classifyTTSCacheStatus(PLAYED_URL)).toBe('unknown')
  })

  it('reports warm_hit for a segment the runway stored, despite the blocking mismatch', () => {
    stubResourceEntry()
    markTTSSegmentWarmed(WARMED_URL)
    expect(classifyTTSCacheStatus(PLAYED_URL)).toBe('warm_hit')
  })

  it('keeps hit and miss meaning what they did, even once warmed', () => {
    markTTSSegmentWarmed(WARMED_URL)
    stubResourceEntry({ decodedBodySize: 30_000, transferSize: 0 })
    expect(classifyTTSCacheStatus(PLAYED_URL)).toBe('hit')
    stubResourceEntry({ decodedBodySize: 30_000, transferSize: 31_000 })
    expect(classifyTTSCacheStatus(PLAYED_URL)).toBe('miss')
  })

  it('forgets the runway once the player clears it', () => {
    stubResourceEntry()
    markTTSSegmentWarmed(WARMED_URL)
    clearTTSWarmedSegments()
    expect(classifyTTSCacheStatus(PLAYED_URL)).toBe('unknown')
  })
})

describe('classifyTTSAudioSource', () => {
  it('reports service_worker for a warmed segment with no timing', () => {
    stubResourceEntry()
    markTTSSegmentWarmed(WARMED_URL)
    expect(classifyTTSAudioSource(PLAYED_URL)).toBe('service_worker')
  })

  it('still reports browser_cache when timing says the browser replayed it', () => {
    markTTSSegmentWarmed(WARMED_URL)
    stubResourceEntry({ decodedBodySize: 30_000, transferSize: 0 })
    expect(classifyTTSAudioSource(PLAYED_URL)).toBe('browser_cache')
  })
})
