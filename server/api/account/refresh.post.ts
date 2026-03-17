import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  if (!session.user.token) {
    throw createError({
      statusCode: 401,
      message: 'TOKEN_NOT_FOUND',
    })
  }
  let userInfoRes: LikerProfileResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerProfileInfo(session.user.token)
  }
  catch (error) {
    console.warn(`Failed to fetch user info for wallet ${walletAddress} in account refresh`, error)
  }
  if (!userInfoRes) return

  await setUserSession(event, {
    user: {
      ...session.user,
      likerId: userInfoRes.user,
      displayName: userInfoRes.displayName,
      description: userInfoRes.description,
      avatar: userInfoRes.avatar,
      isLikerPlus: userInfoRes.isLikerPlus || false,
      isExpiredLikerPlus: userInfoRes.isExpiredLikerPlus || false,
      likerPlusPeriod: userInfoRes.likerPlusPeriod,
    },
  })

  const userDocRef = getUserCollection().doc(walletAddress)
  await userDocRef.set({
    accessTimestamp: FieldValue.serverTimestamp(),
  }, { merge: true })
})
