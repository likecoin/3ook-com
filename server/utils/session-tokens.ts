import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { jwtDecode } from 'jwt-decode'

const SESSIONS_SUBCOLLECTION = 'sessions'

const FALLBACK_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

const FIRESTORE_ALREADY_EXISTS_CODE = 6

export interface SessionTokenDoc {
  token: string
  intercomToken?: string
  loginMethod?: string
  createdAt: Timestamp
  expiresAt: Timestamp
}

function getSessionDocRef(wallet: string, jwtId: string) {
  return getUserCollection().doc(wallet).collection(SESSIONS_SUBCOLLECTION).doc(jwtId)
}

function getJWTExpiry(token: string): Date {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token)
    if (typeof exp === 'number') return new Date(exp * 1000)
  }
  catch { /* ignore */ }
  return new Date(Date.now() + FALLBACK_SESSION_LIFETIME_MS)
}

export async function saveSessionTokens(
  wallet: string,
  jwtId: string,
  data: {
    token: string
    intercomToken?: string
    loginMethod?: string
  },
): Promise<void> {
  const docData: Record<string, unknown> = {
    token: data.token,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(getJWTExpiry(data.token)),
  }
  if (data.intercomToken) docData.intercomToken = data.intercomToken
  if (data.loginMethod) docData.loginMethod = data.loginMethod

  try {
    await getSessionDocRef(wallet, jwtId).create(docData)
  }
  catch (error) {
    const code = (error as { code?: number | string })?.code
    if (code === FIRESTORE_ALREADY_EXISTS_CODE || code === 'already-exists') return
    console.warn('[SessionTokens] Failed to persist session tokens:', error)
  }
}
