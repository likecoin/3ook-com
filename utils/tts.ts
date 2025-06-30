export function splitTextIntoSegments(text: string): string[] {
  if (!text) return []
  const punctuationRegex = /([.!?;。！？；：，、][\s\u200B]*)/
  const segments = text.split(punctuationRegex)
  const result: string[] = []

  let currentSegment = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]?.trim()
    if (!segment) continue
    if (segment.length === 1 || currentSegment.length + segment.length < 100) {
      currentSegment += segment
    }
    else {
      if (currentSegment) {
        result.push(currentSegment)
      }
      currentSegment = segment
    }
  }

  if (currentSegment) {
    result.push(currentSegment)
  }

  return result
}
