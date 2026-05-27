import { FieldValue, GrpcStatus, Timestamp } from 'firebase-admin/firestore'
import { jwtDecode } from 'jwt-decode'
import type { UserSession } from '#auth-utils'

const SESSIONS_SUBCOLLECTION = 'sessions'

/**
 * Reads the session JWT, preferring the server-only `secure` copy and falling
 * back to the legacy client-visible `user.token` for sessions issued before
 * the token moved out of the cookie's public payload. `??` (not `||`) so an
 * empty-string token surfaces loudly instead of silently falling through.
 */
export function getSessionToken(session: UserSession): string | undefined {
  return session.secure?.token ?? session.user?.token
}

const FALLBACK_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

function getFirestoreErrorCode(error: unknown): number | string | undefined {
  return (error as { code?: number | string })?.code
}

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
    if (getFirestoreErrorCode(error) === GrpcStatus.ALREADY_EXISTS) return
    console.warn('[SessionTokens] Failed to persist session tokens:', error)
  }
}

export async function refreshSessionTokens(
  wallet: string,
  jwtId: string,
  data: {
    token: string
    intercomToken?: string
    loginMethod?: string
  },
): Promise<void> {
  if (data.intercomToken) {
    try {
      await getSessionDocRef(wallet, jwtId).update({ intercomToken: data.intercomToken })
      return
    }
    catch (error) {
      if (getFirestoreErrorCode(error) !== GrpcStatus.NOT_FOUND) {
        console.warn('[SessionTokens] Failed to update intercom token:', error)
        return
      }
      // NOT_FOUND: legacy session pre-dates the sessions subcollection. Backfill below.
    }
  }
  await saveSessionTokens(wallet, jwtId, data)
}
