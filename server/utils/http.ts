/**
 * Parses an HTTP Range header (e.g. `bytes=0-1023`) into start/end byte offsets.
 * Returns `null` when the header is malformed or the range is unsatisfiable.
 */
export function parseRangeHeader(
  rangeHeader: string,
  totalSize: number,
): { start: number, end: number } | null {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null

  let start = match[1] ? Number.parseInt(match[1], 10) : NaN
  let end = match[2] ? Number.parseInt(match[2], 10) : NaN

  if (Number.isNaN(start) && Number.isNaN(end)) return null

  // Suffix range: bytes=-500 means last 500 bytes
  if (Number.isNaN(start)) {
    start = Math.max(0, totalSize - end)
    end = totalSize - 1
  }
  else if (Number.isNaN(end)) {
    end = totalSize - 1
  }

  if (start > end || start >= totalSize) return null
  end = Math.min(end, totalSize - 1)

  return { start, end }
}
