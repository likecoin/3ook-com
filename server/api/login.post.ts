import { jwtDecode } from 'jwt-decode'

import { checkIsEVMAddress } from '~/utils'

export default defineEventHandler(async (event) => {
  let body: {
    walletAddress: string
    message: string
    signature: string
  }
  try {
    body = await readBody(event)
    if (!body.walletAddress) {
      throw createError({
        status: 400,
        message: 'MISSING_ADDRESS',
      })
    }
    if (!checkIsEVMAddress(body.walletAddress)) {
      throw createError({
        status: 400,
        message: 'INVALID_ADDRESS',
      })
    }
    if (!body.message) {
      throw createError({
        status: 400,
        message: 'MISSING_MESSAGE',
      })
    }
    if (!body.signature) {
      throw createError({
        status: 400,
        message: 'MISSING_SIGNATURE',
      })
    }
  }
  catch (error) {
    console.error(error)
    throw createError({
      status: 400,
      message: 'INVALID_BODY',
    })
  }

  const config = useRuntimeConfig()
  try {
    let likeWallet: string | undefined
    let jwtId: string | undefined
    let token: string | undefined
    try {
      const authorizeRes = await $fetch<{
        jwtid: string
        token: string
      }>(`${config.public.likeCoinAPIEndpoint}/wallet/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    }
    catch {
      console.warn('Failed to authorize wallet')
    }

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
      }>(`${config.public.likeCoinAPIEndpoint}/users/addr/${body.walletAddress}/min`)
      likerId = userInfoRes.user
      displayName = userInfoRes.displayName
      avatar = userInfoRes.avatar
      description = userInfoRes.description
    }
    catch {
      console.warn('Failed to fetch user info for wallet')
    }

    const userInfo = {
      evmWallet: body.walletAddress,
      likeWallet,
      token,
      jwtId,
      likerId,
      displayName,
      description,
      avatar,
      isEVMModeActive: !likeWallet,
    }
    await setUserSession(event, { user: userInfo })

    return userInfo
  }
  catch (error) {
    if ((error as Error).message === 'LIKECOIN_WALLET_ADDRESS_NOT_FOUND') {
      throw error
    }

    console.error(error)
    throw createError({
      status: 401,
      message: 'LOGIN_FAILED',
    })
  }
})
