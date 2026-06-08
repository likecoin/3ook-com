import type { H3Event } from 'h3'
import type { PacedDeltas } from '~~/shared/utils/analytics-pacing'

interface SessionContext {
  activeReadingTimeMs: number
  ttsActiveTimeMs: number
  pagesViewed: number
  startProgress: number
  endProgress: number
  readerType: 'epub' | 'pdf'
  chapterIndex?: number
  pageIndex?: number
}

interface RecordPacedReadingUsageInput {
  event: H3Event
  source: 'heartbeat' | 'session'
  wallet: string
  nftClassId: string
  sessionId: string
  isLikerPlus: boolean
  isPaidPlus: boolean
  isBorrowed: boolean
  paced: PacedDeltas
  rawDelta: PacedDeltas
  // Present only for session flushes, which carry cumulative totals and progress.
  session?: SessionContext
}

/**
 * Single sink for paced reading/TTS usage, called from both the heartbeat and the
 * session handlers so the two never drift in cadence: it forwards the paced delta to
 * the rev-share ledger and publishes the 3ook_ReadingSession analytics event.
 * ES must aggregate on the *PacedDelta fields (each event carries its own increment);
 * the session absolutes are snapshots, not summable across events.
 */
export async function recordPacedReadingUsage(input: RecordPacedReadingUsageInput): Promise<void> {
  const {
    event,
    source,
    wallet,
    nftClassId,
    sessionId,
    isLikerPlus,
    isPaidPlus,
    isBorrowed,
    paced,
    rawDelta,
    session,
  } = input

  // publishEvent is non-blocking (it enqueues onto a pubsub batch), so emit it
  // before awaiting the ledger forward — the analytics enqueue shouldn't queue
  // behind the forward's network round-trip.
  try {
    publishEvent(event, 'ReadingSession', {
      source,
      evmWallet: wallet,
      isLikerPlus,
      isBorrowed,
      nftClassId,
      sessionId,
      activeReadingTimeMsDelta: rawDelta.activeReadingTimeMsDelta,
      ttsActiveTimeMsDelta: rawDelta.ttsActiveTimeMsDelta,
      activeReadingTimeMsPacedDelta: paced.activeReadingTimeMsDelta,
      ttsActiveTimeMsPacedDelta: paced.ttsActiveTimeMsDelta,
      ...(session && {
        activeReadingTimeMs: session.activeReadingTimeMs,
        ttsActiveTimeMs: session.ttsActiveTimeMs,
        pagesViewed: session.pagesViewed,
        startProgress: session.startProgress,
        endProgress: session.endProgress,
        readerType: session.readerType,
        chapterIndex: session.chapterIndex,
        pageIndex: session.pageIndex,
      }),
    })
  }
  catch (err) {
    console.warn('[ReadingUsage] Failed to publish event:', err)
  }

  // No-ops internally when the paced delta is zero or the user isn't paid Plus.
  // Awaited so it settles before the serverless handler returns.
  await forwardPlusReadingUsage({
    isPaidPlus,
    isBorrowed,
    readerWallet: wallet,
    classId: nftClassId,
    readingTimeMs: paced.activeReadingTimeMsDelta,
    ttsTimeMs: paced.ttsActiveTimeMsDelta,
  })
}
