import { describe, expect, it } from 'vitest'
import { formatDuration } from '~/utils/format-duration'

describe('formatDuration', () => {
  it('returns an empty string for zero or negative input', () => {
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(-1000)).toBe('')
  })

  it('shows "<1 min" for sub-minute durations', () => {
    expect(formatDuration(30_000)).toBe('<1 min')
    expect(formatDuration(30_000, 'zh-Hant')).toBe('<1 分鐘')
  })

  it('formats minute-only durations', () => {
    expect(formatDuration(5 * 60_000)).toBe('5 min')
    expect(formatDuration(5 * 60_000, 'zh-Hant')).toBe('5 分鐘')
  })

  it('formats hours with minutes', () => {
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
    expect(formatDuration(90 * 60_000, 'zh-Hant')).toBe('1 小時 30 分鐘')
  })

  it('omits the minute part on whole hours', () => {
    expect(formatDuration(2 * 60 * 60_000)).toBe('2h')
    expect(formatDuration(2 * 60 * 60_000, 'zh-Hant')).toBe('2 小時')
  })
})
