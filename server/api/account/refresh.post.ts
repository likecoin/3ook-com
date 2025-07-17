export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const walletAddress = session.user.evmWallet || session.user.likeWallet
  if (!walletAddress) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  let userInfoRes: LikerInfoResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerPublicInfoByWalletAddress(walletAddress, { nocache: true })
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
    },
  })
})
