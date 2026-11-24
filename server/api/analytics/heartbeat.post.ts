import { HeartbeatSchema } from '~~/server/schemas/analytics'

export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)
  const body = await readValidatedBody(event, createValidator(HeartbeatSchema))

  const {
    nftClassId,
    sessionId,
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
    isPreview = false,
  } = body

  if (activeReadingTimeMsDelta <= 0 && ttsActiveTimeMsDelta <= 0) {
    return { success: true }
  }

  const paced = await applyWallClockPacing(wallet, nftClassId, {
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
  })

  if (paced.activeReadingTimeMsDelta > 0 || paced.ttsActiveTimeMsDelta > 0) {
    const { isBorrowed } = await incrementBookReadingTime(wallet, nftClassId, {
      activeReadingTimeMs: paced.activeReadingTimeMsDelta,
      ttsActiveTimeMs: paced.ttsActiveTimeMsDelta,
      isLikerPlus,
    })

    await recordPacedReadingUsage({
      event,
      source: 'heartbeat',
      wallet,
      nftClassId,
      sessionId,
      isLikerPlus,
      isBorrowed,
      isPreview,
      paced,
      rawDelta: { activeReadingTimeMsDelta, ttsActiveTimeMsDelta },
    })
  }

  return { success: true }
})
