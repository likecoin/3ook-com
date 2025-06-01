declare module '#auth-utils' {
  interface User {
    evmWallet: string
    likeWallet?: string
    jwtId?: string
    token?: string
    likerId?: string
    displayName?: string
    description?: string
    avatar?: string
    email?: string
    loginMethod?: string
    isEVMModeActive?: boolean
  }
}

export {}
