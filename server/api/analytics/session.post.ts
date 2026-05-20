import { ReadingSessionSchema } from '~~/server/schemas/analytics'

const COMPLETION_THRESHOLD = 95

export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)
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
    tasks.push(incrementBookReadingTime(wallet, nftClassId, {
      activeReadingTimeMs: paced.activeReadingTimeMsDelta,
      ttsActiveTimeMs: paced.ttsActiveTimeMsDelta,
      isLikerPlus,
      countSession: true,
    }))
    tasks.push(updateReadingStreak(wallet))
  }

  let isNewCompletion = false
  if (hasActivity && endProgress >= COMPLETION_THRESHOLD) {
    tasks.push(
      markBookCompleted(wallet, nftClassId).then((result) => { isNewCompletion = result }),
    )
  }

  await Promise.all(tasks)

  try {
    publishEvent(event, 'ReadingSession', {
      evmWallet: wallet,
      isLikerPlus,
      nftClassId,
      sessionId,
      activeReadingTimeMs,
      ttsActiveTimeMs,
      activeReadingTimeMsDelta,
      ttsActiveTimeMsDelta,
      activeReadingTimeMsPacedDelta: paced.activeReadingTimeMsDelta,
      ttsActiveTimeMsPacedDelta: paced.ttsActiveTimeMsDelta,
      pagesViewed,
      startProgress,
      endProgress,
      readerType,
      chapterIndex,
      pageIndex,
    })

    if (isNewCompletion) {
      publishEvent(event, 'BookCompleted', {
        evmWallet: wallet,
        isLikerPlus,
        nftClassId,
        completionProgress: endProgress,
      })
    }
  }
  catch (err) {
    console.warn('[Session] Failed to publish event:', err)
  }

  return { success: true, bookCompleted: isNewCompletion }
})
