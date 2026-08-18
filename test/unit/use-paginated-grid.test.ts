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

interface GridOptions {
  itemsCount: number
  column: number
  maxRows?: number
  hasMore?: boolean
}

// What the browser actually renders: the grid hides overflow through the
// per-breakpoint classes, so these are the counts `getVisibleCount` must match.
function getVisibleCountFromClasses({
  itemsCount,
  column,
  maxRows = 0,
  hasMore = false,
}: GridOptions) {
  const { getGridItemClassesByIndex } = usePaginatedGrid({ itemsCount, hasMore, maxRows })
  let count = 0
  for (let index = 0; index < itemsCount; index++) {
    if (!getGridItemClassesByIndex(index).includes(HIDDEN_CLASS_BY_COLUMN[column]!)) count++
  }
  return count
}

function getVisibleCount({ itemsCount, column, maxRows = 0, hasMore = false }: GridOptions) {
  return usePaginatedGrid({ itemsCount, hasMore, maxRows }).getVisibleCount(column)
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

describe('usePaginatedGrid getVisibleCount', () => {
  // The impression event divides clicks by this count, so it drifting from the
  // hiding classes would silently bill ranks nobody could see.
  it('matches what the per-breakpoint hiding classes render', () => {
    for (const itemsCount of [0, 1, 5, 6, 9, 12, 14, 20]) {
      for (let column = 2; column <= 7; column++) {
        for (const maxRows of [0, 1, 2, 3]) {
          for (const hasMore of [false, true]) {
            const options = { itemsCount, column, maxRows, hasMore }
            expect(getVisibleCount(options), JSON.stringify(options))
              .toBe(getVisibleCountFromClasses(options))
          }
        }
      }
    }
  })

  it('clamps a column count outside the grid range', () => {
    expect(getVisibleCount({ itemsCount: 14, column: 1, maxRows: 2 }))
      .toBe(getVisibleCount({ itemsCount: 14, column: 2, maxRows: 2 }))
    expect(getVisibleCount({ itemsCount: 14, column: 99, maxRows: 2 }))
      .toBe(getVisibleCount({ itemsCount: 14, column: 7, maxRows: 2 }))
  })
})
