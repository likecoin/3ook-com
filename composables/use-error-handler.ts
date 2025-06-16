import { ErrorModal } from '#components'

type ErrorHandler =
  | string
  | {
    description?: string
    isLogError?: boolean
    onClose?: () => void
  }

export default function () {
  const localeRoute = useLocaleRoute()
  const accountStore = useAccountStore()
  const { t: $t } = useI18n()
  const overlay = useOverlay()
  const errorModal = overlay.create(ErrorModal)

  async function handleError(error: unknown, props: {
    title?: string
    description?: string
    customHandlerMap?: Record<string | number, ErrorHandler>
    logPrefix?: string
    onClose?: () => void
  } = {}) {
    const { message: rawErrorMessage, statusCode, url } = parseError(error)
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

        default:
          break
      }
    }

    if (!handler || (typeof handler !== 'string' && handler.isLogError)) {
      console.error(...(props.logPrefix ? [`[${props.logPrefix}]`, error] : [error]))
    }

    let description: string | undefined
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
    else {
      description = parseErrorData<string>(error, 'description') || $t('error_unknown')
    }

    await errorModal.open({
      title: props.title || $t('error_modal_title'),
      description,
      rawMessage: !handler ? `${url ? `${url}\n\n` : ''}${rawErrorMessage}` : undefined,
      onClose: (typeof handler !== 'string' ? handler?.onClose : undefined) || props.onClose,
    })
    return !!handler
  }

  return {
    errorModal,

    handleError,
  }
}
