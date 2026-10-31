// Canonical 3ook.com Library store identifiers and listing URLs, shared by the
// download CTAs (useAppDownloadUrls) and the structured-data / SEO meta.
export const APP_STORE_APP_ID = '6757783481'
// Provider token (pt), fixed per developer account; App Store Connect only
// reports campaign (ct) installs on links that carry it.
export const APP_STORE_PROVIDER_TOKEN = '128517088'
export const ANDROID_PACKAGE_NAME = 'land.liker.book3app'
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_APP_ID}`
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`
