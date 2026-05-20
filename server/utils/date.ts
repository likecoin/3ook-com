export function toUTCDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
