// The monthly chart is an editor-managed CMS tag named `chart-<YYYYMM>`,
// whose Airtable book order is the rank, so the id shape is the feature switch.
// How it looks lives in ./library-chart-layout.
const LIBRARY_CHART_TAG_ID_REGEX = /^chart-(\d{6})$/

export function getIsLibraryChartTagId(tagId: string): boolean {
  return LIBRARY_CHART_TAG_ID_REGEX.test(tagId)
}

// '' when the id isn't a chart tag, so callers can test either way on one call.
export function getLibraryChartMonthFromTagId(tagId: string): string {
  return LIBRARY_CHART_TAG_ID_REGEX.exec(tagId)?.[1] || ''
}

// `2026年8月` / `August 2026`, from the six digits in the id —
// the chart carries no date field of its own.
export function formatLibraryChartMonthLabel(tagId: string, locale: string): string {
  const month = getLibraryChartMonthFromTagId(tagId)
  if (!month) return ''
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(4)) - 1, 1))
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)
}
