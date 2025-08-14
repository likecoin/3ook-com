import { CollectorMessageModal } from '#components'
import type { CollectorMessageModalProps } from '~/components/CollectorMessageModal.props'

export function useCollectorMessage({
  classId,
  paymentId,
  claimingToken,
}: {
  classId: string
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
  const bookCoverSrc = ref('')
  const bookName = ref('')
  const bookAuthor = ref('')

  const modalProps = computed(() => ({
    isLoading: isLoading.value,
    hasSubmitted: hasSubmittedCollectorMessage.value,
    bookCoverSrc: bookCoverSrc.value,
    bookName: bookName.value,
    bookAuthor: bookAuthor.value,
    handleSubmit,
  }))

  const open = async (props: CollectorMessageModalProps) => {
    bookCoverSrc.value = props.bookCoverSrc
    bookName.value = props.bookName
    bookAuthor.value = props.bookAuthor
    return await modal.open(modalProps.value).result
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
        classId,
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
    modal.patch(modalProps.value)
  }

  function reset() {
    isLoading.value = false
    hasSubmittedCollectorMessage.value = false
  }

  return {
    modal,
    open,
    isLoading: readonly(isLoading),
    hasSubmittedCollectorMessage: readonly(hasSubmittedCollectorMessage),
    reset,
  }
}
