import { setUser as setSentryUser } from '@sentry/nuxt'
import { sha256 } from 'viem'
import type { User } from '#auth-utils'

interface EventParams {
  [key: string]: unknown
}

export function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  try {
    useTrackEvent(eventName, eventParams)
    const googleAdConversionId = useRuntimeConfig().public.googleAdConversionId
    if (googleAdConversionId && eventName === 'purchase') {
      const { gtag } = useGtag()
      gtag('event', 'conversion', {
        send_to: googleAdConversionId,
        ...eventParams,
      })
    }
  }
  catch {
    console.error(`Failed to track event: ${eventName}`, eventParams)
  }

  const { proxy } = useScriptMetaPixel()
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

  if (window?.Intercom) {
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

  const { $posthog } = useNuxtApp()
  if ($posthog) {
    try {
      const posthog = $posthog()
      posthog.capture(eventName, eventParams)
    }
    catch (error) {
      console.error(`Failed to log event to PostHog: ${eventName}`, error)
    }
  }
}

export function useSetLogUser(user: User | null) {
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

  // Set user ID in Google Analytics
  const { gtag } = useGtag()
  try {
    if (!user) {
      gtag('set', {
        user_id: null,
      })
    }
    else {
      gtag('set', {
        user_id: sha256(user.evmWallet as `0x${string}`),
        user_data: { email: user.email || undefined },
      })
      gtag('set', 'user_properties', {
        is_liker_plus: !!user.isLikerPlus,
        login_method: user.loginMethod,
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
        external_id: sha256(user?.evmWallet as `0x${string}`),
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
        const { locale } = useI18n()
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
          is_liker_plus: !!user.isLikerPlus,
          locale: locale.value,
        })
      }
    }
    catch (error) {
      console.error('Failed to set user data in Intercom', error)
    }
  }

  const { $posthog } = useNuxtApp()
  if ($posthog) {
    try {
      const posthog = $posthog()
      posthog.identify(
        user?.evmWallet,
        user ? { email: user?.email || undefined, name: user?.displayName || user?.evmWallet || user?.likeWallet } : undefined,
      )
    }
    catch (error) {
      console.error('Failed to set user data in PostHog', error)
    }
  }
}
