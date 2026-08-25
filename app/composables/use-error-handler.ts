import { ErrorModal } from '#components'

type ErrorHandler =
  | string
  | {
    level?: ErrorLevel
    title?: string
    description?: string
    tags?: Array<ErrorHandlerTag>
    actions?: Array<ErrorHandlerAction>
    isLogError?: boolean
    onClose?: () => void
  }

export default function () {
  const nuxtApp = useNuxtApp()
  const localeRoute = useLocaleRoute()
  const accountStore = useAccountStore()
  const { t: $t } = useI18n()
  const overlay = useOverlay()
  const errorModal = overlay.create(ErrorModal)

  async function handleError(error: unknown, props: {
    isFatal?: boolean
    title?: string
    description?: string
    actions?: Array<ErrorHandlerAction>
    customHandlerMap?: Record<string | number, ErrorHandler>
    logPrefix?: string
    onClose?: () => void
  } = {}) {
    const { message: rawErrorMessage, statusCode, url } = parseError(error)

    // A chunk error caught locally (e.g. the store page wrapping navigateTo)
    // never reaches app:chunkError, so the recovery ladder never sees it and the
    // user gets a dead modal instead of the reload that fixes it. Fatal callers
    // still throw — they rely on this never returning normally.
    const isChunkErrorClaimed = import.meta.client && await nuxtApp.$claimChunkError?.(error)
    if (isChunkErrorClaimed && !props.isFatal) return true

    let handler: ErrorHandler | undefined
    // Custom error handling
    if (props.customHandlerMap?.[rawErrorMessage]) {
      handler = props.customHandlerMap[rawErrorMessage]
    }
    else if (statusCode && props.customHandlerMap?.[statusCode]) {
      handler = props.customHandlerMap[statusCode]
    }
    // Generic error handling
    if (!handler) {
      switch (rawErrorMessage) {
        case 'INSUFFICIENT_PERMISSION':
        case 'TOKEN_EXPIRED':
          handler = {
            description: $t('error_token_expired'),
            onClose: async () => {
              try {
                await accountStore.logout()
              }
              catch (error) {
                console.warn('Failed to logout:', error)
              }
              finally {
                await navigateTo(localeRoute({ name: 'account' }))
              }
            },
          }
          break

        case 'MAGIC_SESSION_EXPIRED':
          handler = {
            description: $t('error_wallet_session_expired'),
          }
          break

        case 'WALLET_AUTHORIZATION_PAYLOAD_EXPIRED':
          handler = {
            description: $t('error_wallet_authorization_payload_expired'),
          }
          break

        default:
          break
      }
    }

    const handlerProps = typeof handler !== 'string' ? handler : undefined
    if (!handler || handlerProps?.isLogError) {
      console.error(...(props.logPrefix ? [`[${props.logPrefix}]`, error] : [error]))
    }

    let description: string | undefined
    let isNetworkError = false
    if (typeof handler === 'string') {
      description = handler
    }
    else if (handler) {
      description = handler.description
    }
    else if (props.description) {
      description = props.description
    }
    else if (rawErrorMessage === 'Internal server error' || statusCode === 500) {
      description = $t('error_internal_server_error')
    }
    // Reaching here means the ladder declined, so keep the raw text its surrender
    // rung means to surface — and stay ahead of the network branch, whose
    // `failed to fetch` also matches Chromium's chunk wording.
    else if (CHUNK_ERROR_PATTERNS.some(pattern => rawErrorMessage.includes(pattern))) {
      description = $t('error_unknown')
    }
    // `Load failed` is WebKit's bare fetch rejection and `Failed to fetch` is
    // Chromium's; Nuxt's own FetchError says `<no response>`.
    else if (/no response|network error|connection failed|timeout|load failed|failed to fetch/i.test(rawErrorMessage)) {
      description = $t('error_network_error')
      isNetworkError = true
    }
    else {
      description = parseErrorData<string>(error, 'description') || $t('error_unknown')
    }

    // A recognised network failure has a written message; the raw text and stack
    // add nothing for the reader.
    const hasRawDetails = !handler && !isNetworkError
    const errorData = {
      level: handlerProps?.level || parseErrorData<ErrorLevel>(error, 'level') || 'error',
      title: props.title || handlerProps?.title || parseErrorData<string>(error, 'title') || $t('error_modal_title'),
      description,
      rawMessage: hasRawDetails ? `${url ? `${url}\n\n` : ''}${rawErrorMessage}` : '',
      rawStack: hasRawDetails ? getErrorStack(error) || '' : '',
      tags: handlerProps?.tags || parseErrorData<Array<ErrorHandlerTag>>(error, 'tags') || [],
      actions: props.actions || handlerProps?.actions || parseErrorData<Array<ErrorHandlerAction>>(error, 'actions') || [],
    }

    if (props.isFatal) {
      throw createError({
        statusCode,
        message: description,
        data: errorData,
        fatal: true,
      })
    }

    await errorModal.open({
      ...errorData,
      onClose: handlerProps?.onClose || props.onClose,
    }).result
    return !!handler
  }

  return {
    errorModal,

    handleError,
  }
}
