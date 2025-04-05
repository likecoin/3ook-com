declare module '#auth-utils' {
  interface User {
    likerId: string
    displayName: string
    avatar: string
    description: string
    evmWallet: string
    likeWallet: string
    jwtId: string
    token: string
  }
}

export {}
