import { FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const { session, wallet: walletAddress } = await requireUserSessionWithWallet(event)

  const token = getSessionToken(session)
  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'TOKEN_NOT_FOUND',
    })
  }
  let userInfoRes: LikerProfileResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerProfileInfo(token)
  }
  catch (error) {
    console.warn(`Failed to fetch user info for wallet ${walletAddress} in account refresh`, error)
  }
  if (!userInfoRes) return

  // The upstream /users/profile mints a fresh Intercom Identity Verification
  // JWT (1d lifetime). Rotate it through the session so the once-per-day
  // mount-time refresh in app.vue self-heals every active user. Fall back to
  // the existing token if upstream omits it (e.g. INTERCOM_API_SECRET unset)
  // rather than nulling out a still-valid one.
  const intercomToken = userInfoRes.intercomToken ?? session.user.intercomToken
  const hasIntercomTokenRotated = !!userInfoRes.intercomToken && userInfoRes.intercomToken !== session.user.intercomToken

  await setUserSession(event, {
    user: {
      ...session.user,
      likerId: userInfoRes.user,
      displayName: userInfoRes.displayName,
      avatar: userInfoRes.avatar,
      // Surface email so a self-serve email change reflects after refresh
      // without requiring re-login; fall back to the existing session value.
      email: userInfoRes.email ?? session.user.email,
      isLikerPlus: userInfoRes.isLikerPlus || false,
      isLikerPlusTrial: userInfoRes.isLikerPlusTrial || false,
      isExpiredLikerPlus: userInfoRes.isExpiredLikerPlus || false,
      likerPlusPeriod: userInfoRes.likerPlusPeriod,
      likerPlusProvider: userInfoRes.likerPlusProvider,
      likerPlusSubscriptionStatus: userInfoRes.likerPlusSubscriptionStatus,
      plusAffiliateFrom: userInfoRes.plusAffiliateFrom,
      intercomToken,
      // Backfill ttsKey for sessions that pre-date its introduction so they
      // can use the per-user TTS sig path without re-login. Safe no-op for
      // sessions that already have one.
      ttsKey: session.user.ttsKey ?? generateTTSKey(),
    },
    secure: { token },
  })

  const userDocRef = getUserCollection().doc(walletAddress)
  await Promise.all([
    userDocRef.set({
      accessTimestamp: FieldValue.serverTimestamp(),
    }, { merge: true }),
    hasIntercomTokenRotated && session.user.evmWallet && session.user.jwtId
      ? refreshSessionTokens(session.user.evmWallet, session.user.jwtId, {
          token,
          intercomToken,
          loginMethod: session.user.loginMethod,
        })
      : Promise.resolve(),
  ])
})
