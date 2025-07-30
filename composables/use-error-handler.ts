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
  const localeRoute = useLocaleRoute()
  const accountStore = useAccountStore()
  const { t: $t } = useI18n()
  const overlay = useOverlay()
  const errorModal = overlay.create(ErrorModal)

  async function handleError(error: unknown, props: {
    isFatal?: boolean
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

    const handlerProps = typeof handler !== 'string' ? handler : undefined
    if (!handler || handlerProps?.isLogError) {
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
    else if (/no response|network error|connection failed|timeout/i.test(rawErrorMessage)) {
      description = $t('error_network_error')
    }
    else {
      description = parseErrorData<string>(error, 'description') || $t('error_unknown')
    }

    const errorData = {
      level: handlerProps?.level || parseErrorData<ErrorLevel>(error, 'level') || 'error',
      title: props.title || handlerProps?.title || parseErrorData<string>(error, 'title') || $t('error_modal_title'),
      description,
      rawMessage: !handler ? `${url ? `${url}\n\n` : ''}${rawErrorMessage}` : '',
      tags: handlerProps?.tags || parseErrorData<Array<ErrorHandlerTag>>(error, 'tags') || [],
      actions: handlerProps?.actions || parseErrorData<Array<ErrorHandlerAction>>(error, 'actions') || [],
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
