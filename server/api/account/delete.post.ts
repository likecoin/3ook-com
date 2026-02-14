export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const { evmWallet, likerId } = session.user

  if (!likerId) {
    throw createError({
      status: 400,
      message: 'MISSING_LIKER_ID',
    })
  }

  const body = await readBody<{
    wallet: string
    signMethod: string
    authorizeSignature: string
    authorizeMessage: string
    deleteSignature: string
    deleteMessage: string
  }>(event)
  if (!body?.authorizeSignature || !body?.authorizeMessage
    || !body?.deleteSignature || !body?.deleteMessage) {
    throw createError({
      status: 400,
      message: 'MISSING_SIGNATURE',
    })
  }

  // Authorize with write permission to get a fresh JWT
  let writeToken: string
  try {
    const authorizeRes = await getLikeCoinAPIFetch()<{
      token: string
    }>('/wallet/authorize', {
      method: 'POST',
      body: {
        wallet: body.wallet,
        signature: body.authorizeSignature,
        message: body.authorizeMessage,
        signMethod: body.signMethod,
      },
    })
    writeToken = authorizeRes.token
  }
  catch (error) {
    console.error('Failed to authorize for account deletion:', error)
    throw createError({
      status: 401,
      message: 'AUTHORIZATION_FAILED',
    })
  }

  // Delete account on LikeCoin API
  try {
    await getLikeCoinAPIFetch()(`/users/delete/${likerId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${writeToken}`,
      },
      body: {
        signature: {
          signature: body.deleteSignature,
          message: body.deleteMessage,
        },
        signMethod: body.signMethod,
      },
    })
  }
  catch (error) {
    console.error('Failed to delete account on LikeCoin API:', error)
    throw createError({
      status: 500,
      message: 'DELETE_ACCOUNT_API_FAILED',
    })
  }

  // Delete user document and all subcollections from Firestore
  try {
    const firestore = getFirestoreDb()
    await firestore.recursiveDelete(getUserCollection().doc(evmWallet))
  }
  catch (error) {
    console.error('Failed to delete user data from Firestore:', error)
  }

  await clearUserSession(event)
})
