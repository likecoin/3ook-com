import { describe, expect, it } from 'vitest'
import {
  formatLibraryChartMonthLabel,
  getIsLibraryChartTagId,
  getLibraryChartMonthFromTagId,
} from '~/utils/library-chart'

describe('getIsLibraryChartTagId', () => {
  it('accepts a `chart-<YYYYMM>` tag id', () => {
    expect(getIsLibraryChartTagId('chart-202608')).toBe(true)
    expect(getIsLibraryChartTagId('chart-202601')).toBe(true)
  })

  it('rejects the prefix without a month', () => {
    expect(getIsLibraryChartTagId('chart')).toBe(false)
    expect(getIsLibraryChartTagId('chart-')).toBe(false)
  })

  // A neighbouring tag must not inherit the chart layout
  // just by sharing a prefix.
  it('rejects a longer prefix or a malformed month', () => {
    expect(getIsLibraryChartTagId('charts-202608')).toBe(false)
    expect(getIsLibraryChartTagId('chart-2026')).toBe(false)
    expect(getIsLibraryChartTagId('chart-2026081')).toBe(false)
    expect(getIsLibraryChartTagId('chart-2026-08')).toBe(false)
  })

  it('rejects unrelated tag ids', () => {
    expect(getIsLibraryChartTagId('popular')).toBe(false)
    expect(getIsLibraryChartTagId('staking-total-staked')).toBe(false)
    expect(getIsLibraryChartTagId('')).toBe(false)
  })
})

describe('getLibraryChartMonthFromTagId', () => {
  it('extracts the month', () => {
    expect(getLibraryChartMonthFromTagId('chart-202608')).toBe('202608')
  })

  it('returns an empty string for a non-chart tag', () => {
    expect(getLibraryChartMonthFromTagId('popular')).toBe('')
    expect(getLibraryChartMonthFromTagId('chart-2026')).toBe('')
    expect(getLibraryChartMonthFromTagId('')).toBe('')
  })
})

describe('formatLibraryChartMonthLabel', () => {
  it('formats the month in the given locale', () => {
    expect(formatLibraryChartMonthLabel('chart-202608', 'zh-Hant')).toBe('2026年8月')
    expect(formatLibraryChartMonthLabel('chart-202608', 'en')).toBe('August 2026')
  })

  // January is month 01, and a naive `Number(month.slice(4))` off-by-one
  // would land in December of the year before.
  it('keeps January in its own year', () => {
    expect(formatLibraryChartMonthLabel('chart-202601', 'en')).toBe('January 2026')
    expect(formatLibraryChartMonthLabel('chart-202612', 'en')).toBe('December 2026')
  })

  it('returns an empty string for a non-chart tag', () => {
    expect(formatLibraryChartMonthLabel('popular', 'en')).toBe('')
    expect(formatLibraryChartMonthLabel('', 'en')).toBe('')
  })
})
