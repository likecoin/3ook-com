import type { H3Event } from 'h3'
import type { PacedDeltas } from '~~/shared/utils/analytics-pacing'
import { parseRegionCode } from '~~/shared/utils/region'

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
  isBorrowed: boolean
  // 試閱 sessions read the server-truncated file. isBorrowed is never true for
  // a preview (so it can't fund rev-share), but ES needs the flag to segment
  // preview reads from owned reads.
  isPreview: boolean
  paced: PacedDeltas
  rawDelta: PacedDeltas
  // Present only for session flushes, which carry cumulative totals and progress.
  session?: SessionContext
}

/**
 * Reader's country, off the browser's own request, kept only when it parses as an
 * ISO-3166-1 code so a cf-ipcountry sentinel ('XX', 'T1') never becomes a region.
 * Deliberately without useDetectedGeolocation's browser-locale fallback: that reads a
 * language preference as a location, which is fine for a UI placeholder and wrong for a
 * usage statistic.
 */
function getRequestIPCountry(event: H3Event): string | undefined {
  return parseRegionCode(getRequestHeader(event, 'cf-ipcountry'))
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
    isBorrowed,
    isPreview,
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
      isPreview,
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

  // No-ops internally only when every paced delta is zero; otherwise forwards
  // library and non-library engagement separately.
  // Awaited so it settles before the serverless handler returns.
  await forwardReadingUsage({
    isBorrowed,
    readerWallet: wallet,
    classId: nftClassId,
    readingTimeMs: paced.activeReadingTimeMsDelta,
    ttsTimeMs: paced.ttsActiveTimeMsDelta,
    ipCountry: getRequestIPCountry(event),
  })
}
