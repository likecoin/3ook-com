import { jwtDecode } from 'jwt-decode'

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
      },
    })

    const { likeWallet } = jwtDecode<{ likeWallet: string }>(authorizeRes.token)
    if (!likeWallet) {
      throw createError({
        status: 401,
        message: 'LIKECOIN_WALLET_ADDRESS_NOT_FOUND',
      })
    }

    const userInfoRes = await $fetch<{
      user: string
      displayName: string
      avatar: string
      description: string
    }>(`${config.public.likeCoinAPIEndpoint}/users/addr/${likeWallet}/min`)

    const userInfo = {
      likerId: userInfoRes.user,
      displayName: userInfoRes.displayName,
      avatar: userInfoRes.avatar,
      description: userInfoRes.description,
      evmWallet: body.walletAddress,
      likeWallet: likeWallet,
      token: authorizeRes.token,
      jwtId: authorizeRes.jwtid,
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
