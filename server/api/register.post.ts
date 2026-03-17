import { FetchError } from 'ofetch'
import { FieldValue } from 'firebase-admin/firestore'

import { RegisterBodySchema } from '~/server/schemas/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createValidator(RegisterBodySchema))

  try {
    await getLikeCoinAPIFetch()('/users/new', {
      method: 'POST',
      body: {
        from: body.walletAddress,
        sign: body.signature,
        payload: body.message,
        platform: 'evmWallet',
        user: body.accountId,
        email: body.email,
        magicUserId: body.magicUserId,
        magicDIDToken: body.magicDIDToken,
        locale: body.locale?.startsWith('zh') ? 'zh' : 'en',
      },
    })
  }
  catch (error) {
    let message = 'REGISTER_FAILED'
    if (error instanceof FetchError) {
      message = error.data?.error || error.data || error.message
    }
    else if (error instanceof Error) {
      message = error.message
    }

    console.error(`Failed to register user with wallet ${body.walletAddress}`, error)
    throw createError({
      status: 401,
      message,
    })
  }

  // Fetch user info
  let userInfoRes: LikerInfoResponseData | undefined = undefined
  try {
    userInfoRes = await fetchLikerPublicInfoByWalletAddress(body.walletAddress, { nocache: true })
  }
  catch (error) {
    console.error(`Failed to fetch user info for wallet ${body.walletAddress} after registration`, error)
    if (error instanceof FetchError && error.statusCode === 404) {
      throw createError({
        status: 401,
        message: 'REGISTER_USER_NOT_FOUND',
      })
    }
    throw error
  }
  if (!userInfoRes) {
    throw createError({
      status: 401,
      message: 'CANNOT_FETCH_USER_INFO',
    })
  }

  const userInfo = {
    evmWallet: body.walletAddress,
    likerId: userInfoRes.user,
    displayName: userInfoRes.displayName,
    description: userInfoRes.description,
    avatar: userInfoRes.avatar,
    email: body.email,
    loginMethod: body.loginMethod,
    isLikerPlus: userInfoRes.isLikerPlus || false,
    isExpiredLikerPlus: userInfoRes.isExpiredLikerPlus || false,
  }
  await setUserSession(event, { user: userInfo })

  const userDocRef = getUserCollection().doc(body.walletAddress)
  await userDocRef.set({
    registerTimestamp: FieldValue.serverTimestamp(),
    loginTimestamp: FieldValue.serverTimestamp(),
    accessTimestamp: FieldValue.serverTimestamp(),
    loginMethod: body.loginMethod,
  }, { merge: true })

  publishEvent(event, 'UserRegister', {
    evmWallet: body.walletAddress,
    likerId: userInfoRes.user,
    loginMethod: body.loginMethod,
    locale: body.locale,
  })

  return userInfo
})
