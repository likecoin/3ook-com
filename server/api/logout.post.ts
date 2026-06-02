export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const evmWallet = session?.user?.evmWallet
  const likerId = session?.user?.likerId
  const jwtId = session?.user?.jwtId

  // Drop the server-side session record before clearing the cookie. Once the JWT
  // lives only in Firestore (later migration steps), this is what revokes it on
  // logout — clearing the cookie alone wouldn't.
  if (evmWallet && jwtId) {
    await deleteSessionTokens(evmWallet, jwtId)
  }

  await clearUserSession(event)

  publishEvent(event, 'UserLogout', { evmWallet, likerId })
})
