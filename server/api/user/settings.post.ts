import { jwtDecode } from 'jwt-decode'

const ALLOWED_KEYS = ['locale', 'currency', 'colorMode'] as const satisfies readonly UserSettingKey[]

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }

  const body = await readBody(event)

  const invalidKeys = Object.keys(body).filter(key => !ALLOWED_KEYS.includes(key as UserSettingKey))
  if (invalidKeys.length > 0) {
    throw createError({
      statusCode: 400,
      message: `INVALID_KEYS: ${invalidKeys.join(', ')}`,
    })
  }

  // Enforce color mode restriction for non-Plus users
  const isLikerPlus = session.user.isLikerPlus || false
  if ('colorMode' in body && !isLikerPlus) {
    // Non-Plus users can only use light mode
    body.colorMode = 'light'
  }

  try {
    await updateUserSettings(wallet, body)
  }
  catch (error) {
    console.error('Error updating user settings:', error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_UPDATE_USER_SETTINGS',
    })
  }

  // Sync locale to like.co user preferences API
  if ('locale' in body && session.user.token) {
    try {
      const decoded = jwtDecode<{ permissions?: string[] }>(session.user.token)
      const hasWritePreferences = decoded.permissions?.includes('write:preferences')
      if (hasWritePreferences) {
        await getLikeCoinAPIFetch()('/users/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.user.token}`,
          },
          body: {
            locale: body.locale?.startsWith('zh') ? 'zh' : 'en',
          },
        })
      }
    }
    catch (error) {
      console.error('Error syncing locale to like.co:', error)
    }
  }

  return { success: true }
})
