// Formats a millisecond duration into a compact human-readable string, e.g.
// "1h 30m", "5 min", "<1 min" (and zh-Hant equivalents). Returns '' for 0.
export function formatDuration(ms: number, locale = 'en'): string {
  if (!ms || ms <= 0) return ''

  const isZH = locale.startsWith('zh')
  const totalMinutes = Math.floor(ms / 60000)

  if (totalMinutes < 1) {
    return isZH ? '<1 分鐘' : '<1 min'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    if (isZH) {
      return minutes > 0 ? `${hours} 小時 ${minutes} 分鐘` : `${hours} 小時`
    }
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return isZH ? `${minutes} 分鐘` : `${minutes} min`
}
