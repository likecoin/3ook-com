import { ReadingSessionSchema } from '~~/server/schemas/analytics'

const COMPLETION_THRESHOLD = 95

export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus, isPaidPlus } = await requireUserWalletWithStatus(event)
  const body = await readValidatedBody(event, createValidator(ReadingSessionSchema))

  const {
    nftClassId,
    sessionId,
    activeReadingTimeMs,
    ttsActiveTimeMs,
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
    pagesViewed,
    startProgress,
    endProgress,
    readerType,
    chapterIndex,
    pageIndex,
  } = body

  const hasActivity = activeReadingTimeMs > 0 || ttsActiveTimeMs > 0
  const hasDelta = activeReadingTimeMsDelta > 0 || ttsActiveTimeMsDelta > 0

  const paced = hasDelta
    ? await applyWallClockPacing(wallet, nftClassId, {
      activeReadingTimeMsDelta,
      ttsActiveTimeMsDelta,
    })
    : { activeReadingTimeMsDelta: 0, ttsActiveTimeMsDelta: 0 }

  const tasks: Promise<unknown>[] = []
  if (hasActivity) {
    // Record paced usage (rev-share forward + analytics publish) once the book's
    // borrow status is known, in parallel with the other session tasks. Shared with
    // the heartbeat handler so the ledger and ES never drift in cadence.
    tasks.push(
      incrementBookReadingTime(wallet, nftClassId, {
        activeReadingTimeMs: paced.activeReadingTimeMsDelta,
        ttsActiveTimeMs: paced.ttsActiveTimeMsDelta,
        isLikerPlus,
        countSession: true,
      }).then(({ isBorrowed }) => recordPacedReadingUsage({
        event,
        source: 'session',
        wallet,
        nftClassId,
        sessionId,
        isLikerPlus,
        isPaidPlus,
        isBorrowed,
        paced,
        rawDelta: { activeReadingTimeMsDelta, ttsActiveTimeMsDelta },
        session: {
          activeReadingTimeMs,
          ttsActiveTimeMs,
          pagesViewed,
          startProgress,
          endProgress,
          readerType,
          chapterIndex,
          pageIndex,
        },
      })),
    )
    tasks.push(updateReadingStreak(wallet))
  }

  let isNewCompletion = false
  if (hasActivity && endProgress >= COMPLETION_THRESHOLD) {
    tasks.push(
      markBookCompleted(wallet, nftClassId).then((result) => { isNewCompletion = result }),
    )
  }

  await Promise.all(tasks)

  if (isNewCompletion) {
    publishEvent(event, 'BookCompleted', {
      evmWallet: wallet,
      isLikerPlus,
      nftClassId,
      completionProgress: endProgress,
    })
  }

  return { success: true, bookCompleted: isNewCompletion }
})
