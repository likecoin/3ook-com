export interface MigrateMagicEmailUserResponseData {
  isMigratedBookUser: boolean
  isMigratedBookOwner: boolean
  isMigratedLikerId: boolean
  isMigratedLikerLand: boolean
}

export function useUserAccountSessionAPI() {
  const { user } = useUserSession()
  const fetch = useLikeCoinSessionFetch()

  async function migrateMagicEmailUser({
    wallet,
    signature,
    message,
  }: {
    wallet: string
    signature: string
    message: string
  }) {
    return fetch.value<MigrateMagicEmailUserResponseData>(`/wallet/evm/migrate/email/magic`, {
      method: 'POST',
      body: {
        wallet,
        signature,
        message,
      },
    })
  }

  function updateUserProfile({ displayName }: { displayName: string }) {
    return fetch.value(`/users/update`, {
      method: 'POST',
      body: { displayName },
    })
  }

  // Advisory pre-check that the new login email is free in our DB, run before
  // triggering Magic's email change. Throws EMAIL_ALREADY_USED if taken.
  function checkEmailAvailability(email: string) {
    return fetch.value(`/users/email/check`, {
      method: 'POST',
      body: { email },
    })
  }

  // Persists the new email. For Magic users a matching magicDIDToken keeps the
  // email verified (Magic already OTP-verified it); wallet users get a reset
  // verified flag and a separate verification email (see sendEmailVerification).
  function updateUserEmail({ email, magicDIDToken }: { email: string, magicDIDToken?: string }) {
    return fetch.value(`/users/update`, {
      method: 'POST',
      body: { email, ...(magicDIDToken ? { magicDIDToken } : {}) },
    })
  }

  function sendEmailVerification() {
    const likerId = user.value?.likerId
    if (!likerId) throw new Error('MISSING_LIKER_ID')
    return fetch.value(`/email/verify/user/${likerId}/`, {
      method: 'POST',
      body: { ref: 'account' },
    })
  }

  function uploadUserAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatarFile', file)
    return fetch.value<{ avatar: string }>(`/users/update/avatar`, {
      method: 'POST',
      body: formData,
    })
  }

  return {
    migrateMagicEmailUser,
    updateUserProfile,
    checkEmailAvailability,
    updateUserEmail,
    sendEmailVerification,
    uploadUserAvatar,
  }
}
