// Both TTS players answer with a warmedThrough: the absolute index of the
// highest segment playable with no network. Runway is its distance from the
// playhead, floored — a report that has fallen behind the playhead (the native
// shell's are dropped while the WebView is suspended) means no runway, not a
// negative one.
export function getWarmRunwayFrom(warmedThrough: number, currentIndex: number): number {
  return Math.max(warmedThrough - currentIndex, 0)
}
