declare module '#auth-utils' {
  interface User {
    evmWallet: string
    likeWallet?: string
    jwtId?: string
    token?: string
    intercomToken?: string
    likerId?: string
    // Public handle shown as the referral code. Absent (or equal to `likerId`)
    // until the account spends its one-time rename.
    handle?: string
    displayName?: string
    avatar?: string
    email?: string
    loginMethod?: string
    isLikerPlus?: boolean
    isLikerPlusTrial?: boolean
    isExpiredLikerPlus?: boolean
    likerPlusPeriod?: LikerPlusStatus
    likerPlusTier?: LikerPlusTier
    likerPlusProvider?: LikerPlusProvider
    likerPlusStore?: LikerPlusStore
    plusAffiliateFrom?: string
    ttsKey?: string
    likerPlusSubscriptionStatus?: 'active' | 'past_due' | 'canceled'
  }
  interface SecureSessionData {
    token?: string
  }
}

export {}
