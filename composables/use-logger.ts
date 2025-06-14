import { setUser as setSentryUser } from '@sentry/nuxt'
import { sha256 } from 'viem'
import type { User } from '#auth-utils'

interface EventParams {
  [key: string]: unknown
}

export function useLogEvent(eventName: string, eventParams: EventParams = {}) {
  try {
    useTrackEvent(eventName, eventParams)
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
    }
    if (eventNameMapping[eventName]) {
      const {
        transaction_id: paymentId,
        value,
        currency,
        items,
      } = eventParams
      const eventId = paymentId ? `${eventName}_${paymentId}` : undefined
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
      }, { eventID: eventId })
    }
  }
  catch {
    console.error(`Failed to track event with Meta Pixel: ${eventName}`, eventParams)
  }

  const { instance: crisp } = useScriptCrisp()
  if (crisp) {
    try {
      const { items, ...params } = eventParams
      if (items) {
        params.items = JSON.stringify(items)
      }
      crisp.set('session:event', [[[eventName, params]]])
    }
    catch (error) {
      console.error(`Failed to log event to Crisp: ${eventName}`, error)
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
    }
  }
  catch (error) {
    console.error('Failed to set user ID in Google Analytics', error)
  }

  // Set user info in Crisp
  const { instance: crisp } = useScriptCrisp()
  if (crisp) {
    try {
      if (!user) {
        crisp.do('session:reset')
        return
      }
      else {
        if (user.email) crisp.set('user:email', user.email)
        if (user.evmWallet) crisp.set('session:data', ['evm_wallet', `op:${user.evmWallet}`])
        if (user.likeWallet) crisp.set('session:data', ['like_wallet', user.likeWallet])
        if (user.loginMethod) crisp.set('session:data', ['login_method', user.loginMethod])
        if (user.displayName) {
          crisp.set('user:nickname', user.displayName)
        }
        else if (user.evmWallet || user.likeWallet) {
          crisp.set('user:nickname', user.evmWallet || user.likeWallet)
        }
        if (user.avatar) crisp.set('user:avatar', user.avatar)
      }
    }
    catch (error) {
      console.error('Failed to set user data in Crisp', error)
    }
  }
}
