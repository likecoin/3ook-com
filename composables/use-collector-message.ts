import { CollectorMessageModal } from '#components'
import type { CollectorMessageModalProps } from '~/components/CollectorMessageModal.props'

export function useCollectorMessage({
  nftClassId,
  paymentId,
  claimingToken,
}: {
  nftClassId: Ref<string>
  paymentId: string
  claimingToken: string
}) {
  const { user } = useUserSession()
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { t: $t } = useI18n()
  const { handleError } = useErrorHandler()

  const overlay = useOverlay()
  const modal = overlay.create(CollectorMessageModal)

  const isLoading = ref(false)
  const hasSubmittedCollectorMessage = ref(false)
  const bookInfoProps = ref<CollectorMessageModalProps>({
    bookCoverSrc: '',
    bookName: '',
    bookAuthor: '',
  })

  function getModalProps() {
    return {
      ...bookInfoProps.value,
      isLoading: isLoading.value,
      hasSubmitted: hasSubmittedCollectorMessage.value,
      onSubmit: handleSubmit,
    }
  }

  const open = async (props: CollectorMessageModalProps) => {
    bookInfoProps.value = props
    const modalProps = getModalProps()

    return await modal.open(modalProps).result
  }

  async function handleSubmit({ message }: { message: string }) {
    if (!user.value?.evmWallet) {
      throw new Error('User wallet not found')
    }

    isLoading.value = true
    updateModal()

    try {
      const result = await likeCoinSessionAPI.sendCollectorMessage({
        message,
        nftClassId: nftClassId.value,
        wallet: user.value.evmWallet,
        paymentId,
        claimToken: claimingToken,
      })

      hasSubmittedCollectorMessage.value = !!result
    }
    catch (error) {
      handleError(error, {
        title: $t('claim_page_collector_message_error'),
        logPrefix: 'Send Collector Message',
      })
      throw error
    }
    finally {
      isLoading.value = false
      updateModal()
      if (hasSubmittedCollectorMessage.value) {
        await sleep(2000)
        modal.close()
      }
    }
  }

  function updateModal() {
    modal.patch(getModalProps())
  }

  function reset() {
    isLoading.value = false
    hasSubmittedCollectorMessage.value = false
  }

  return {
    open,
    isLoading: readonly(isLoading),
    hasSubmittedCollectorMessage: readonly(hasSubmittedCollectorMessage),
    reset,
  }
}
