import { setUser as setSentryUser } from '@sentry/nuxt'
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
  'shelf_claim_free_book',

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

export function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  try {
    const { proxy } = useScriptGoogleAnalytics()
    proxy.gtag('event', eventName, eventParams)
  }
  catch {
    console.error(`Failed to track event: ${eventName}`, eventParams)
  }

  try {
    const eventNameMapping: { [key: string]: string } = {
      view_item: 'ViewContent',
      begin_checkout: 'InitiateCheckout',
      add_to_cart: 'AddToCart',
      purchase: 'Purchase',
      search: 'Search',
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
      } = eventParams
      const eventId = paymentId ? `${eventNameMapping[eventName]}_${paymentId}` : undefined
      const { proxy } = useScriptMetaPixel()
      proxy.fbq('track', eventNameMapping[eventName], {
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
      }, { eventID: eventId })
    }
  }
  catch {
    console.error(`Failed to track event with Meta Pixel: ${eventName}`, eventParams)
  }

  if (window?.Intercom && INTERCOM_EVENT_ALLOWLIST.has(eventName)) {
    try {
      const { items, ...params } = eventParams
      if (items) {
        params.items = JSON.stringify(items)
      }
      window.Intercom('trackEvent', eventName, params)
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
    // Dedupe against the backend-fired counterpart (posthog-node) for the same transaction.
    if (typeof eventParams.transaction_id === 'string' && eventParams.transaction_id) {
      posthogParams.$insert_id = `${eventName}_${eventParams.transaction_id}`
    }
    proxy.posthog.capture(eventName, { app: '3ook', ...posthogParams })
  }
  catch (error) {
    console.error(`Failed to log event to PostHog: ${eventName}`, error)
  }
}

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

  // Set user info in Intercom
  if (window?.Intercom) {
    try {
      const intercom = window.Intercom
      if (!user) {
        intercom('shutdown')
        return
      }
      else {
        intercom('update', {
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
        })
      }
    }
    catch (error) {
      console.error('Failed to set user data in Intercom', error)
    }
  }

  try {
    const { proxy } = useScriptPostHog()
    proxy.posthog.identify(
      user?.evmWallet,
      user
        ? {
            email: user?.email || undefined,
            name: user?.displayName || user?.evmWallet || user?.likeWallet,
            locale,
            is_liker_plus: !!user.isLikerPlus,
            login_method: user.loginMethod,
          }
        : undefined,
    )
  }
  catch (error) {
    console.error('Failed to set user data in PostHog', error)
  }

  // Sync user identity to the native app for its own analytics SDKs
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
      })
    }
    else {
      postToNative({ type: 'resetUser' })
    }
  }
}
