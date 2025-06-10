export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet || session.user.likeWallet

  let likerId: string | undefined
  let displayName: string | undefined
  let description: string | undefined
  let avatar: string | undefined
  let isLikerPlus = false
  const config = useRuntimeConfig()
  try {
    const userInfoRes = await $fetch<{
      user: string
      displayName: string
      description: string
      avatar: string
      isLikerPlus?: boolean
    }>(`${config.public.likeCoinAPIEndpoint}/users/addr/${wallet}/min?ts=${Date.now()}`)
    likerId = userInfoRes.user
    displayName = userInfoRes.displayName
    avatar = userInfoRes.avatar
    description = userInfoRes.description
    isLikerPlus = userInfoRes.isLikerPlus || false
  }
  catch {
    console.warn('Failed to fetch user info for wallet')
  }
  await setUserSession(event, {
    user: {
      ...session.user,
      likerId,
      displayName,
      description,
      avatar,
      isLikerPlus,
    },
  })
  console.log('isLikerPlus', isLikerPlus)
})
