import { setUser as setSentryUser } from '@sentry/nuxt'
import { v5 as uuidv5 } from 'uuid'
import { sha256 } from 'viem'
import type { User } from '#auth-utils'

interface EventParams {
  [key: string]: unknown
}

// Intercom caps unique event names at 120 per workspace. Only forward events
// that give CS agents meaningful context for a user's ticket; all other events
// still reach PostHog / GA4 / Meta Pixel unchanged.
const INTERCOM_EVENT_ALLOWLIST = new Set<string>([
  // Auth & account state
  'sign_up',
  'login',
  'login_error',
  'login_wallet_rejected',
  'login_email_already_used',
  'register_email_already_used',
  'register_invalid_account_id',
  'login_panel_open',
  'login_register_cancelled',

  // Commerce funnel
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'purchase',
  'checkout_error',

  // Gift & claim flows
  'claim_started',
  'claim_error',
  'claim_timeout',
  'plus_gift_claimed',

  // Subscription
  'start_trial',
  'subscribe',
  'subscription_button_click',
  'subscription_login_required',
  'subscription_checkout_error',

  // Reader engagement
  'reading_session_start',
  'reading_session_end',
  'shelf_open_book',
  'shelf_download_book',

  // TTS outcomes
  'tts_start',
  'tts_completed',
  'tts_error',
  'tts_try_modal_open',
  'tts_trial_exhausted',
  'tts_trial_chip_impression',
  'tts_trial_chip_click',

  // Annotations
  'annotation_created',
  'export_annotations',

  // Wallet / high-stakes on-chain
  'burn_nft_success',
  'burn_nft_error',
  'stake_success',
  'unstake_amount_success',
  'donate_reward_success',
  'claim_rewards_success',
  'staking_claim_all_rewards_success',
  'migrate_legacy_book_button_click',
  'account_delete_account_success',
  'export_private_key',
  'customer_service',

  // Deposit / withdraw actions
  'deposit_button_click',
  'deposit_withdraw_button_click',
  'deposit_claim_rewards_button_click',
])

// Events that the API server (likecoin-api-public) also fires via posthog-node from the
// Stripe webhook handler. Both sides build the same URL string from (eventName,
// transaction_id) and hash it under RFC 4122 NAMESPACE_URL to get a deterministic uuidv5,
// which is passed as `CaptureOptions.uuid`. PostHog's ClickHouse dedup tuple
// (timestamp, distinct_id, event, uuid) then collapses the pair into one row. The
// matching server helper lives in likecoin-api-public/src/util/posthog.ts — the URL
// format below is the contract; keep both sides identical or dedup breaks silently.
// The 5 entries below are the subset of likecoin-api-public's SERVER_EVENT_MAP that the
// browser also fires (from success pages after a user action).
const POSTHOG_SERVER_MIRRORED_EVENTS = new Set<string>([
  'begin_checkout',
  'purchase',
  'start_trial',
  'subscribe',
  'plus_acquisition',
])

// The host must be a fixed literal: substituting useRuntimeConfig().public.siteUrl or
// any env-aware hostname would flip between testnet/mainnet and silently break dedup.
function derivePostHogEventUUID(eventName: string, transactionId: string): string {
  return uuidv5(`https://3ook.com/posthog-dedup/${eventName}/${transactionId}`, uuidv5.URL)
}

// Conversion events the API server also mirrors to GA4 via the Measurement Protocol
// (logServerEvents -> logGA4Events), keyed to the same session by the gaClientId it persists
// into Stripe metadata at checkout. GA4 has no client<->server dedup key (unlike PostHog's uuid
// or Meta Pixel's eventID), so the browser must not emit an event the server also sends. The
// server fires GA4 only when value+currency are present (logServerEvents returns early otherwise),
// so the client mirrors that exact gate below; value-less calls (e.g. cart/gift begin_checkout,
// which have no server mirror) must keep firing from the browser. Kept separate from
// POSTHOG_SERVER_MIRRORED_EVENTS because PostHog is mirrored regardless of value+currency.
const GA4_SERVER_MIRRORED_EVENTS = new Set<string>([
  'begin_checkout',
  'purchase',
  'start_trial',
  'subscribe',
  'plus_acquisition',
])

export function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  // Skip the client emit only when the server will mirror this conversion to GA4 — i.e. when
  // value+currency are present, matching the server's own gate (see GA4_SERVER_MIRRORED_EVENTS)
  // — to avoid double-counting; the server's Measurement Protocol event is then authoritative.
  const isGA4ServerMirrored = GA4_SERVER_MIRRORED_EVENTS.has(eventName)
    && typeof eventParams.value === 'number' && Number.isFinite(eventParams.value)
    && typeof eventParams.currency === 'string' && !!eventParams.currency
  if (!isGA4ServerMirrored) {
    try {
      const { proxy } = useScriptGoogleAnalytics()
      proxy.gtag('event', eventName, eventParams)
    }
    catch (error) {
      console.error(`Failed to track event: ${eventName}`, error, eventParams)
    }
  }

  try {
    // Maps our GA4-style event names to Meta Pixel standard events. Prefer GA4
    // recommended names as keys; app-specific names (e.g. store/library search
    // submit) map to the closest Meta standard event.
    const eventNameMapping: { [key: string]: string } = {
      view_item: 'ViewContent',
      begin_checkout: 'InitiateCheckout',
      add_to_cart: 'AddToCart',
      add_to_wishlist: 'AddToWishlist',
      purchase: 'Purchase',
      store_search_submit: 'Search',
      library_search_submit: 'Search',
      sign_up: 'CompleteRegistration',
      start_trial: 'StartTrial',
      subscribe: 'Subscribe',
    }
    if (eventNameMapping[eventName]) {
      const {
        transaction_id: paymentId,
        value,
        currency,
        items,
        predicted_ltv: predictedLTV,
        search_term: searchString,
      } = eventParams
      const metaEventName = eventNameMapping[eventName]
      const eventId = paymentId ? `${metaEventName}_${paymentId}` : undefined
      const { proxy } = useScriptMetaPixel()
      proxy.fbq('track', metaEventName, {
        currency,
        value,
        order_id: paymentId,
        content_type: items ? 'product' : undefined,
        contents: Array.isArray(items)
          ? items.map(i => ({
              id: i.id,
              quantity: i.quantity || 1,
            }))
          : undefined,
        content_ids: Array.isArray(items) ? items.map(i => i.id) : undefined,
        predicted_ltv: predictedLTV,
        search_string: searchString,
      }, { eventID: eventId })
    }

    // Custom (non-standard) Meta events. PlusAcquisition is the unified Plus
    // conversion signal fired alongside start_trial/subscribe; optimize ad sets on it.
    const customEventNameMapping: { [key: string]: string } = {
      plus_acquisition: 'PlusAcquisition',
    }
    if (customEventNameMapping[eventName]) {
      const {
        transaction_id: paymentId,
        value,
        currency,
        predicted_ltv: predictedLTV,
        is_trial: isTrial,
      } = eventParams
      const metaEventName = customEventNameMapping[eventName]
      const eventId = paymentId ? `${metaEventName}_${paymentId}` : undefined
      const { proxy } = useScriptMetaPixel()
      proxy.fbq('trackCustom', metaEventName, {
        currency,
        value,
        order_id: paymentId,
        predicted_ltv: predictedLTV,
        is_trial: isTrial,
      }, { eventID: eventId })
    }
  }
  catch {
    console.error(`Failed to track event with Meta Pixel: ${eventName}`, eventParams)
  }

  if (INTERCOM_EVENT_ALLOWLIST.has(eventName)) {
    try {
      const { items, ...params } = eventParams
      if (items) {
        params.items = JSON.stringify(items)
      }
      if (isNativeIntercomAvailable()) {
        postToNative({ type: 'intercomTrackEvent', name: eventName, metaData: params })
      }
      else if (isWebIntercomReady()) {
        window.Intercom('trackEvent', eventName, params)
      }
    }
    catch (error) {
      console.error(`Failed to log event to Intercom: ${eventName}`, error)
    }
  }

  try {
    const { proxy } = useScriptPostHog()
    const posthogParams = { ...eventParams }
    if (Array.isArray(posthogParams.items)) {
      const classIds = posthogParams.items
        .map((item: { id?: string }) => item.id?.split('-')[0])
        .filter((id): id is string => !!id && id.startsWith('0x'))
      if (classIds.length) {
        posthogParams.nft_class_ids = classIds.join(',')
      }
    }
    const transactionId = typeof posthogParams.transaction_id === 'string'
      ? posthogParams.transaction_id
      : undefined
    const captureOptions = POSTHOG_SERVER_MIRRORED_EVENTS.has(eventName) && transactionId
      ? { uuid: derivePostHogEventUUID(eventName, transactionId) }
      : undefined
    proxy.posthog.capture(eventName, { app: '3ook', ...posthogParams }, captureOptions)
  }
  catch (error) {
    console.error(`Failed to log event to PostHog: ${eventName}`, error)
  }
}

// Guards against `reset()` on the initial null user — stores/account.ts
// watches with `immediate: true`, so cold loads enter this fn before login
// state hydrates; resetting then would wipe attribution super-properties.
let hasIdentifiedPostHog = false

export function useSetLogUser(user: User | null, locale: string) {
  // Set user in Sentry
  if (!user) {
    setSentryUser(null)
  }
  else {
    setSentryUser({
      id: user?.evmWallet,
      email: user?.email,
      username: user?.displayName || user?.evmWallet || user?.likeWallet,
    })
  }

  const hashedWallet = user
    ? sha256(user.evmWallet as `0x${string}`)
    : undefined

  // Set user ID in Google Analytics
  try {
    const { proxy } = useScriptGoogleAnalytics()
    if (!user) {
      proxy.gtag('set', {
        user_id: null,
      })
    }
    else {
      proxy.gtag('set', {
        user_id: hashedWallet,
        user_data: { email: user.email || undefined },
      })
      ;(proxy.gtag as (...args: unknown[]) => void)('set', 'user_properties', {
        is_liker_plus: !!user.isLikerPlus,
        login_method: user.loginMethod,
        locale,
      })
    }
  }
  catch (error) {
    console.error('Failed to set user ID in Google Analytics', error)
  }

  const { proxy } = useScriptMetaPixel()
  const metaPixelId = useRuntimeConfig().public.scripts.metaPixel.id
  if (metaPixelId && user?.evmWallet) {
    try {
      proxy.fbq('init', metaPixelId, {
        em: user?.email,
        external_id: hashedWallet,
      })
    }
    catch (error) {
      console.error('Failed to initialize Meta Pixel with user data', error)
    }
  }

  // In app, the native SDK owns identity (driven by identifyUser/resetUser
  // below). In the browser, sync identity via the web SDK.
  if (import.meta.client && !isNativeIntercomAvailable()) {
    try {
      if (!user) {
        const { app_id } = window.intercomSettings || {}
        window.intercomSettings = app_id ? { app_id } : {}
        window.Intercom?.('shutdown')
      }
      else {
        const userSettings = {
          intercom_user_jwt: user.intercomToken,
          session_duration: 2592000000, // 30d
          user_id: user.likerId,
          email: user.email,
          name: user.displayName || user.evmWallet || user.likeWallet,
          avatar: user.avatar
            ? {
                type: 'avatar',
                image_url: user.avatar,
              }
            : undefined,
          evm_wallet: user.evmWallet,
          like_wallet: user.likeWallet,
          login_method: user.loginMethod,
          locale,
        }
        window.intercomSettings = { ...window.intercomSettings, ...userSettings }
        window.Intercom?.('update', userSettings)
      }
    }
    catch (error) {
      console.error('Failed to set user data in Intercom', error)
    }
  }

  try {
    const { proxy, onLoaded } = useScriptPostHog()
    if (user) {
      hasIdentifiedPostHog = true
      onLoaded(({ posthog }) => {
        // Source attribution from persisted super-properties; the URL may have
        // been stripped by a Magic Link redirect before identify fires.
        const lastTouch: Record<string, string> = {}
        const firstTouch: Record<string, string> = {}
        for (const key of POSTHOG_ATTRIBUTION_KEYS) {
          const last = posthog.get_property(key)
          if (typeof last === 'string' && last) lastTouch[key] = last
          const first = posthog.get_property(`initial_${key}`)
          if (typeof first === 'string' && first) firstTouch[`initial_${key}`] = first
        }
        posthog.identify(
          user.evmWallet,
          {
            email: user.email || undefined,
            name: user.displayName || user.evmWallet || user.likeWallet,
            locale,
            is_liker_plus: !!user.isLikerPlus,
            login_method: user.loginMethod,
            ...lastTouch,
          },
          firstTouch,
        )
      })
    }
    else if (hasIdentifiedPostHog) {
      hasIdentifiedPostHog = false
      proxy.posthog.reset()
    }
  }
  catch (error) {
    console.error('Failed to set user data in PostHog', error)
  }

  // Sync user identity to the native app for its own analytics SDKs
  // and (when supported) the native Intercom SDK. Older app builds
  // that don't know about intercomToken simply ignore the extra fields.
  if (isNativeWebView()) {
    if (user) {
      postToNative({
        type: 'identifyUser',
        userId: user.evmWallet,
        gaUserId: hashedWallet,
        email: user.email || undefined,
        displayName: user.displayName || user.evmWallet || user.likeWallet,
        isLikerPlus: !!user.isLikerPlus,
        loginMethod: user.loginMethod,
        locale,
        // Intercom Identity Verification token + correlation IDs.
        intercomToken: user.intercomToken,
        likerId: user.likerId,
        evmWallet: user.evmWallet,
        likeWallet: user.likeWallet,
      })
    }
    else {
      postToNative({ type: 'resetUser' })
    }
  }
}
