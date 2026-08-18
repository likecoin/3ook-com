declare interface TTSAudioPlayerEvents {
  play: () => void
  pause: () => void
  buffering: () => void
  ended: () => void
  trackChanged: (index: number, meta?: { isResync?: boolean }) => void
  allEnded: () => void
  error: (error: string | Event | MediaError) => void
  positionState: (state: { position: number, duration: number }) => void
  rateForced: (rate: number) => void
}

declare interface TTSAudioPlayer {
  load(options: {
    segments: TTSSegment[]
    // `blocking` asks the server for a complete buffered response instead of a
    // stream. Prefetching needs it: an abandoned stream makes the server drop
    // its half-written cache object, costing the next listener a regeneration.
    getAudioSrc: (segment: TTSSegment, options?: { blocking?: boolean }) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
    // Segments to keep cached ahead of the playhead so a dropout doesn't stall
    // playback — on disk natively, in the service worker cache on web. 1 means
    // no lookahead beyond the idle player's next segment.
    prefetchCount?: number
  }): void
  // False when the player cannot resume in place — never loaded, or errored —
  // so the caller falls back to a full load rather than a silent no-op.
  resume(): boolean
  pause(): void
  stop(): void
  skipTo(index: number): void
  setRate(rate: number): void
  seek(time: number): void
  getPosition(): { position: number, duration: number } | null
  wasInterruptedByBackground(): boolean
  getCurrentURL(): string
  // Segments ahead of the playhead that are already local, so a dropout can be
  // judged on what is playable rather than on connectivity. Each player answers
  // from what it actually knows; nothing else can see inside their caches.
  getWarmRunway(): number
  on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]): void
}
