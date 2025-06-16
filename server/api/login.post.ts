import { jwtDecode } from 'jwt-decode'

import { checkIsEVMAddress } from '~/utils'
import type { LikerInfoResponseData } from '~/utils/api'

export default defineEventHandler(async (event) => {
  let body: {
    walletAddress: string
    message: string
    signature: string
    email?: string
    loginMethod: string
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
    catch (error) {
      console.error('Failed to authorize wallet:', error)
      throw createError({
        status: 401,
        message: 'WALLET_AUTHORIZATION_FAILED',
      })
    }

    let userInfoRes: LikerInfoResponseData | undefined = undefined
    try {
      userInfoRes = await fetchLikerPublicInfoByWalletAddress(body.walletAddress, { nocache: true })
    }
    catch (error) {
      console.error('Failed to fetch user info for wallet', error)
      throw createError({
        status: 401,
        message: 'LOGIN_WITHOUT_LIKER_ID',
      })
    }

    const userInfo = {
      evmWallet: body.walletAddress,
      likeWallet,
      token,
      jwtId,
      likerId: userInfoRes.user,
      displayName: userInfoRes.displayName,
      description: userInfoRes.description,
      avatar: userInfoRes.avatar,
      email: body.email,
      loginMethod: body.loginMethod,
      isLikerPlus: userInfoRes.isLikerPlus || false,
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
