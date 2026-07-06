import { jwtDecode } from 'jwt-decode'

import { UserSettingsUpdateSchema } from '~~/shared/schemas/user-settings'

export default defineEventHandler(async (event) => {
  const { session, wallet } = await requireUserSessionWithWallet(event)

  const body = await readValidatedBody(event, createValidator(UserSettingsUpdateSchema))

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
  const token = getSessionToken(session)
  if ('locale' in body && token) {
    try {
      const decoded = jwtDecode<{ permissions?: string[] }>(token)
      const hasWritePreferences = decoded.permissions?.includes('write:preferences')
      if (hasWritePreferences) {
        await getLikeCoinAPIFetch()('/users/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
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

  publishEvent(event, 'UserSettingsUpdate', {
    evmWallet: wallet,
    changedKeys: Object.keys(body),
  })

  return { success: true }
})
