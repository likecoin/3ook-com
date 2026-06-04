import { jwtDecode } from 'jwt-decode'
import { FieldValue } from 'firebase-admin/firestore'
import { FetchError } from 'ofetch'

import { LoginBodySchema } from '~~/server/schemas/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createValidator(LoginBodySchema))

  let likeWallet: string | undefined
  let jwtId: string | undefined
  let token: string | undefined
  let intercomToken: string | undefined
  try {
    const authorizeRes = await getLikeCoinAPIFetch()<{
      jwtid: string
      token: string
      intercomToken?: string
    }>('/wallet/authorize', {
      method: 'POST',
      body: {
        wallet: body.walletAddress,
        signature: body.signature,
        message: body.message,
        signMethod: 'personal_sign',
        expiresIn: '30d',
      },
    })
    ;({ likeWallet } = jwtDecode<{ likeWallet: string }>(authorizeRes.token))
    jwtId = authorizeRes.jwtid
    token = authorizeRes.token
    intercomToken = authorizeRes.intercomToken
  }
  catch (error) {
    // Unwrap the upstream response body so the actual failure reason isn't swallowed.
    // ofetch exposes a text body as a string in `error.data`, or a parsed JSON body's fields.
    let upstreamError: string | undefined
    if (error instanceof FetchError) {
      const data = error.data as string | { error?: string, message?: string } | undefined
      upstreamError = typeof data === 'string'
        ? data
        : data?.error || data?.message
    }

    console.error('Failed to authorize wallet:', error, upstreamError)

    // A signed message that's no longer valid almost always means the device clock is off.
    if (upstreamError === 'PAYLOAD_EXPIRED') {
      throw createError({
        status: 401,
        message: 'WALLET_AUTHORIZATION_PAYLOAD_EXPIRED',
      })
    }

    throw createError({
      status: 401,
      message: upstreamError
        ? `WALLET_AUTHORIZATION_FAILED: ${upstreamError}`
        : 'WALLET_AUTHORIZATION_FAILED',
    })
  }

  let userInfoRes: LikerProfileResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerProfileInfo(token)
  }
  catch (error) {
    console.error('Failed to fetch user info for wallet', error)
    throw createError({
      status: 401,
      message: 'LOGIN_WITHOUT_LIKER_ID',
    })
  }
  if (!userInfoRes) {
    throw createError({
      status: 401,
      message: 'CANNOT_FETCH_USER_INFO',
    })
  }

  const userInfo = {
    evmWallet: body.walletAddress,
    likeWallet,
    token,
    jwtId,
    intercomToken,
    likerId: userInfoRes.user,
    displayName: userInfoRes.displayName,
    avatar: userInfoRes.avatar,
    email: body.email || userInfoRes.email,
    loginMethod: body.loginMethod,
    isLikerPlus: userInfoRes.isLikerPlus || false,
    isLikerPlusTrial: userInfoRes.isLikerPlusTrial || false,
    isExpiredLikerPlus: userInfoRes.isExpiredLikerPlus || false,
    likerPlusPeriod: userInfoRes.likerPlusPeriod,
    likerPlusProvider: userInfoRes.likerPlusProvider,
    likerPlusSubscriptionStatus: userInfoRes.likerPlusSubscriptionStatus,
    plusAffiliateFrom: userInfoRes.plusAffiliateFrom,
    ttsKey: generateTTSKey(),
  }
  await setUserSession(event, {
    user: userInfo,
    secure: { token },
  })

  const userDocRef = getUserCollection().doc(body.walletAddress)
  await Promise.all([
    userDocRef.set({
      loginTimestamp: FieldValue.serverTimestamp(),
      accessTimestamp: FieldValue.serverTimestamp(),
      loginMethod: body.loginMethod,
    }, { merge: true }),
    token && jwtId
      ? saveSessionTokens(body.walletAddress, jwtId, {
          token,
          intercomToken,
          loginMethod: body.loginMethod,
        })
      : Promise.resolve(),
  ])

  publishEvent(event, 'UserLogin', {
    evmWallet: body.walletAddress,
    likerId: userInfoRes.user,
    loginMethod: body.loginMethod,
  })

  return userInfo
})
