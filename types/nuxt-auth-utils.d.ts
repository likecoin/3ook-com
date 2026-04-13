declare module '#auth-utils' {
  interface User {
    evmWallet: string
    likeWallet?: string
    jwtId?: string
    token?: string
    intercomToken?: string
    likerId?: string
    displayName?: string
    description?: string
    avatar?: string
    email?: string
    loginMethod?: string
    isLikerPlus?: boolean
    isExpiredLikerPlus?: boolean
    likerPlusPeriod?: LikerPlusStatus
    plusAffiliateFrom?: string
    ttsKey?: string
  }
}

export {}
