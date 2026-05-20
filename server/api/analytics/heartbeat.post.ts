import { HeartbeatSchema } from '~~/server/schemas/analytics'

export default defineEventHandler(async (event) => {
  const { wallet, isLikerPlus } = await requireUserWalletWithStatus(event)
  const body = await readValidatedBody(event, createValidator(HeartbeatSchema))

  const {
    nftClassId,
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
  } = body

  if (activeReadingTimeMsDelta <= 0 && ttsActiveTimeMsDelta <= 0) {
    return { success: true }
  }

  const paced = await applyWallClockPacing(wallet, nftClassId, {
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
  })

  if (paced.activeReadingTimeMsDelta > 0 || paced.ttsActiveTimeMsDelta > 0) {
    await incrementBookReadingTime(wallet, nftClassId, {
      activeReadingTimeMs: paced.activeReadingTimeMsDelta,
      ttsActiveTimeMs: paced.ttsActiveTimeMsDelta,
      isLikerPlus,
    })
  }

  return { success: true }
})
