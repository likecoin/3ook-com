const COLUMN_CLASSES = [
  // [GRID_CLASS, GRID_ITEM_CLASS]
  ['grid-cols-3', 'max-tablet:hidden'],
  ['tablet:grid-cols-4', 'tablet:max-laptop:hidden'],
  ['laptop:grid-cols-5', 'laptop:max-desktop:hidden'],
  ['desktop:grid-cols-6', 'desktop:max-widescreen:hidden'],
  ['widescreen:grid-cols-7', 'widescreen:hidden'],
]

const COLUMN_MAX = 7
const COLUMN_MIN = 3

function getColumnClass(column: number) {
  const [grid, gridItem] = COLUMN_CLASSES[column - COLUMN_MIN] || []
  return { grid, gridItem }
}

export default function usePaginatedGrid(props: {
  columnMax?: number
  columnMin?: number
  itemsCount?: Ref<number> | number
  hasMore?: Ref<boolean> | boolean
  gapClass?: string
}) {
  const columnMax = computed(() => Math.min(props.columnMax || COLUMN_MAX, COLUMN_MAX))
  const columnMin = computed(() => Math.max(props.columnMin || COLUMN_MIN, COLUMN_MIN))
  const itemsCount = computed(() => toValue(props.itemsCount) || 0)
  const hasMore = computed(() => toValue(props.hasMore) || false)

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
    const remainder = itemsCount.value % column
    return remainder !== 0 && index >= itemsCount.value - remainder
  }

  function getGridItemClassesByIndex(index: number) {
    const classes: string[] = []
    if (hasMore.value) {
      const isPossiblyLastRow = index >= itemsCount.value - 1 - columnMax.value
      if (isPossiblyLastRow) {
        for (let column = columnMin.value; column <= columnMax.value; column++) {
          if (isInIncompleteRow(index, column)) {
            const gridItemClass = getColumnClass(column).gridItem
            if (gridItemClass) classes.push(gridItemClass)
          }
        }
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
