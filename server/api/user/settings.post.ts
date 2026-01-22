const ALLOWED_KEYS = ['locale', 'currency', 'colorMode'] as const satisfies readonly UserSettingKey[]

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const body = await readBody(event)

  const invalidKeys = Object.keys(body).filter(key => !ALLOWED_KEYS.includes(key as UserSettingKey))
  if (invalidKeys.length > 0) {
    throw createError({
      statusCode: 400,
      message: `INVALID_KEYS: ${invalidKeys.join(', ')}`,
    })
  }

  try {
    await updateUserSettings(wallet, body)
    return { success: true }
  }
  catch (error) {
    console.error('Error updating user settings:', error)
    throw createError({
      statusCode: 500,
      message: 'FAILED_TO_UPDATE_USER_SETTINGS',
    })
  }
})
