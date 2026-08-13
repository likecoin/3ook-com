const COLUMN_CLASSES = [
  // [GRID_CLASS, GRID_ITEM_CLASS]
  ['grid-cols-2', 'max-tiny-phone:hidden'],
  ['tiny-phone:grid-cols-3', 'tiny-phone:max-tablet:hidden'],
  ['tablet:grid-cols-4', 'tablet:max-laptop:hidden'],
  ['laptop:grid-cols-5', 'laptop:max-desktop:hidden'],
  ['desktop:grid-cols-6', 'desktop:max-widescreen:hidden'],
  ['widescreen:grid-cols-7', 'widescreen:hidden'],
]

export const GRID_COLUMN_MAX = 7

const COLUMN_MIN = 2

function getColumnClass(column: number) {
  const [grid, gridItem] = COLUMN_CLASSES[column - COLUMN_MIN] || []
  return { grid, gridItem }
}

export default function usePaginatedGrid(props: {
  columnMax?: number
  columnMin?: number
  itemsCount?: Ref<number> | number
  hasMore?: Ref<boolean> | boolean
  // Caps visible rows per breakpoint
  maxRows?: Ref<number> | number
  gapClass?: string
}) {
  const columnMax = computed(() => Math.min(props.columnMax || GRID_COLUMN_MAX, GRID_COLUMN_MAX))
  const columnMin = computed(() => Math.max(props.columnMin || COLUMN_MIN, COLUMN_MIN))
  const itemsCount = computed(() => toValue(props.itemsCount) || 0)
  const hasMore = computed(() => toValue(props.hasMore) || false)
  const maxRows = computed(() => toValue(props.maxRows) || 0)

  const gridClasses = computed(() => {
    const classes = ['grid']
    for (let column = columnMin.value; column <= columnMax.value; column++) {
      const gridClass = getColumnClass(column).grid
      if (gridClass) classes.push(gridClass)
    }
    if (props.gapClass) {
      classes.push(props.gapClass)
    }
    else {
      classes.push(
        'gap-x-3 tablet:gap-x-6',
        'gap-y-6 tablet:gap-y-11',
      )
    }
    return classes
  })

  function isInIncompleteRow(index: number, column: number) {
    if (itemsCount.value < column) return false
    const remainder = itemsCount.value % column
    return remainder !== 0 && index >= itemsCount.value - remainder
  }

  function getGridItemClassesByIndex(index: number) {
    const classes: string[] = []
    if (!hasMore.value && maxRows.value <= 0) return classes
    const isTrimmedLastRow = hasMore.value && index >= itemsCount.value - 1 - columnMax.value
    for (let column = columnMin.value; column <= columnMax.value; column++) {
      const isHiddenIncompleteRow = isTrimmedLastRow && isInIncompleteRow(index, column)
      // Whole rows only: under the cap, the ragged last row is trimmed too.
      const maxVisibleCount = maxRows.value * column
      const isBeyondMaxRows = maxRows.value > 0
        && (index >= maxVisibleCount
          || (itemsCount.value <= maxVisibleCount && isInIncompleteRow(index, column)))
      if (isHiddenIncompleteRow || isBeyondMaxRows) {
        const gridItemClass = getColumnClass(column).gridItem
        if (gridItemClass) classes.push(gridItemClass)
      }
    }
    return classes
  }

  return {
    gridClasses,
    getGridItemClassesByIndex,
    columnMax,
  }
}
