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

  // Advisory pre-check for the rename form. Unauthenticated upstream, and false
  // for a malformed handle as well as a taken one — the form validates format
  // itself so it can tell the two apart in its hint. Takes options so the caller
  // can abort a probe the user has already typed past.
  function checkLikerIdAvailability(likerId: string, options: { signal?: AbortSignal } = {}) {
    return fetch.value<{ handle: string, isAvailable: boolean }>(
      `/users/handle/${encodeURIComponent(likerId)}/available`,
      options,
    )
  }

  // One-time rename of the public handle. The account's internal id (and so its
  // wallet, JWT and purchases) is untouched; the old handle stays a permanent
  // alias so links already in circulation keep resolving.
  function updateUserLikerId(likerId: string) {
    return fetch.value<{ user: string, handle: string, previousHandle: string }>(`/users/handle`, {
      method: 'POST',
      body: { handle: likerId },
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
    checkLikerIdAvailability,
    updateUserLikerId,
    checkEmailAvailability,
    updateUserEmail,
    sendEmailVerification,
    uploadUserAvatar,
  }
}
