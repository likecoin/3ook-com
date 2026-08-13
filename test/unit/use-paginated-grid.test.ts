import { describe, expect, it } from 'vitest'
import usePaginatedGrid from '~/composables/use-paginated-grid'

const HIDDEN_CLASS_BY_COLUMN: Record<number, string> = {
  2: 'max-tiny-phone:hidden',
  3: 'tiny-phone:max-tablet:hidden',
  4: 'tablet:max-laptop:hidden',
  5: 'laptop:max-desktop:hidden',
  6: 'desktop:max-widescreen:hidden',
  7: 'widescreen:hidden',
}

function getVisibleCount({
  itemsCount,
  column,
  maxRows = 0,
  hasMore = false,
}: {
  itemsCount: number
  column: number
  maxRows?: number
  hasMore?: boolean
}) {
  const { getGridItemClassesByIndex } = usePaginatedGrid({ itemsCount, hasMore, maxRows })
  let count = 0
  for (let index = 0; index < itemsCount; index++) {
    if (!getGridItemClassesByIndex(index).includes(HIDDEN_CLASS_BY_COLUMN[column]!)) count++
  }
  return count
}

describe('usePaginatedGrid maxRows', () => {
  it('shows everything when neither maxRows nor hasMore is set', () => {
    expect(getVisibleCount({ itemsCount: 9, column: 7 })).toBe(9)
    expect(getVisibleCount({ itemsCount: 9, column: 2 })).toBe(9)
  })

  it('caps items at maxRows whole rows per breakpoint', () => {
    expect(getVisibleCount({ itemsCount: 14, column: 7, maxRows: 2 })).toBe(14)
    expect(getVisibleCount({ itemsCount: 14, column: 6, maxRows: 2 })).toBe(12)
    expect(getVisibleCount({ itemsCount: 14, column: 5, maxRows: 2 })).toBe(10)
    expect(getVisibleCount({ itemsCount: 14, column: 2, maxRows: 2 })).toBe(4)
  })

  it('trims a ragged last row when all items fit under the cap', () => {
    expect(getVisibleCount({ itemsCount: 9, column: 7, maxRows: 2 })).toBe(7)
    expect(getVisibleCount({ itemsCount: 9, column: 6, maxRows: 2 })).toBe(6)
    expect(getVisibleCount({ itemsCount: 9, column: 4, maxRows: 2 })).toBe(8)
  })

  it('keeps a lone under-full row instead of hiding everything', () => {
    expect(getVisibleCount({ itemsCount: 5, column: 7, maxRows: 2 })).toBe(5)
  })

  it('keeps exact multiples untouched', () => {
    expect(getVisibleCount({ itemsCount: 6, column: 3, maxRows: 2 })).toBe(6)
  })

  it('keeps hasMore incomplete-row trimming independent of maxRows', () => {
    expect(getVisibleCount({ itemsCount: 9, column: 7, hasMore: true })).toBe(7)
    expect(getVisibleCount({ itemsCount: 14, column: 7, hasMore: true })).toBe(14)
  })
})
