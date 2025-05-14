import { FetchError } from 'ofetch'

import { ErrorModal } from '#components'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (error instanceof FetchError) {
    if (typeof error.data === 'string') {
      return error.data
    }
    if (error.data?.message) {
      return error.data.message
    }
  }
  if (typeof error === 'string') {
    return error
  }
  return ''
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
    onClose?: () => void
  } = {}) {
    let hasHandled = false
    let description = props.description
    let closeHandler = props.onClose
    const errorMessage = getErrorMessage(error)
    switch (errorMessage) {
      case 'TOKEN_EXPIRED':
        description = $t('error_token_expired')
        closeHandler = () => {
          accountStore.logout()
          navigateTo(localeRoute({ name: 'account' }))
        }
        hasHandled = true
        break

      case 'Internal server error':
        description = $t('error_internal_server_error')
        break

      default:
        break
    }
    if (!hasHandled) {
      console.error(error)
    }
    await errorModal.open({
      title: props.title || $t('error_modal_title'),
      description: description || $t('error_unknown'),
      rawMessage: errorMessage,
      onClose: closeHandler,
    })
    return hasHandled
  }

  return {
    errorModal,

    handleError,
  }
}
