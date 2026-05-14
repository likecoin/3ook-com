import { HeartbeatSchema } from '~~/server/schemas/analytics'

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const body = await readValidatedBody(event, createValidator(HeartbeatSchema))

  const {
    nftClassId,
    activeReadingTimeMsDelta,
    ttsActiveTimeMsDelta,
  } = body

  if (activeReadingTimeMsDelta > 0 || ttsActiveTimeMsDelta > 0) {
    await incrementBookReadingTime(
      wallet,
      nftClassId,
      activeReadingTimeMsDelta,
      ttsActiveTimeMsDelta,
    )
  }

  return { success: true }
})
