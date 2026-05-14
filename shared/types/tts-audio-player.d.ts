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
    getAudioSrc: (segment: TTSSegment) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
  }): void
  resume(): boolean
  pause(): void
  stop(): void
  skipTo(index: number): void
  setRate(rate: number): void
  seek(time: number): void
  getPosition(): { position: number, duration: number } | null
  wasInterruptedByBackground(): boolean
  getCurrentURL(): string
  on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]): void
}
