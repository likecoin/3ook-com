import { FetchError } from 'ofetch'

import { checkIsEVMAddress } from '~/utils'

export default defineEventHandler(async (event) => {
  let body: {
    walletAddress: string
    message: string
    signature: string
    email?: string
    accountId?: string
    loginMethod: string
    magicUserId?: string
    magicDIDToken?: string
  }
  try {
    body = await readBody(event)
    if (!body.walletAddress) {
      throw createError({
        status: 400,
        message: 'REGISTER_MISSING_ADDRESS',
      })
    }
    if (!checkIsEVMAddress(body.walletAddress)) {
      throw createError({
        status: 400,
        message: 'REGISTER_INVALID_ADDRESS',
      })
    }
    if (!body.message) {
      throw createError({
        status: 400,
        message: 'REGISTER_MISSING_MESSAGE',
      })
    }
    if (!body.signature) {
      throw createError({
        status: 400,
        message: 'REGISTER_MISSING_SIGNATURE',
      })
    }
  }
  catch (error) {
    console.error(error)
    throw createError({
      status: 400,
      message: 'REGISTER_INVALID_BODY',
    })
  }

  const config = useRuntimeConfig()
  try {
    await $fetch(`${config.public.likeCoinAPIEndpoint}/users/new`, {
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
      },
    })
  }
  catch (error) {
    let message = 'REGISTER_FAILED'
    if (error instanceof FetchError) {
      message = error.data
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
  let likerId: string | undefined
  let displayName: string | undefined
  let description: string | undefined
  let avatar: string | undefined
  try {
    const userInfoRes = await $fetch<{
      user: string
      displayName: string
      description: string
      avatar: string
    }>(`${config.public.likeCoinAPIEndpoint}/users/addr/${body.walletAddress}/min`, {
      query: { ts: Date.now() },
    })
    likerId = userInfoRes.user
    displayName = userInfoRes.displayName
    avatar = userInfoRes.avatar
    description = userInfoRes.description
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

  const userInfo = {
    evmWallet: body.walletAddress,
    likerId,
    displayName,
    description,
    avatar,
    email: body.email,
    loginMethod: body.loginMethod,
    isEVMModeActive: true,
  }
  await setUserSession(event, { user: userInfo })

  return userInfo
})
