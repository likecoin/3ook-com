import { initializeApp, getApps } from 'firebase-admin/app'
import type { App } from 'firebase-admin/app'

let app: App | undefined

export function getFirebaseApp(): App {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp()
    }
    else {
      app = getApps()[0]
    }

    if (!app) {
      throw createError({ statusMessage: 'Failed to initialize Firebase app' })
    }
  }
  return app
}
