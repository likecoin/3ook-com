export function useClaimableBooks() {
  const { t: $t } = useI18n()
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const blockingModal = useBlockingModal()
  const localeRoute = useLocaleRoute()
  const { handleError } = useErrorHandler()
  const intercom = useIntercom()

  const nftClassIds = ref<string[]>([])
  const isLoading = ref(false)

  const count = computed(() => nftClassIds.value.length)

  async function fetchClaimableFreeBooks() {
    if (isLoading.value) return
    try {
      isLoading.value = true
      const response = await likeCoinSessionAPI.fetchClaimableFreeBooks()
      nftClassIds.value = response
    }
    catch (error) {
      // Soft-fail: a blocking error modal on every transient failure breaks the persisted shelf UX.
      console.warn('Failed to fetch claimable free books:', error)
    }
    finally {
      isLoading.value = false
    }
  }

  async function claimFreeBook(nftClassId: string) {
    if (isLoading.value) return
    try {
      isLoading.value = true
      blockingModal.open({ title: $t('claiming') })
      const response = await likeCoinSessionAPI.claimFreeBook(nftClassId)

      await navigateTo(localeRoute({
        name: 'claim-page',
        query: {
          cart_id: response.cartId,
          payment_id: response.paymentId,
          nft_class_id: response.classIds,
          claiming_token: response.claimToken,
        },
      }))
    }
    catch (error) {
      await handleError(error, {
        customHandlerMap: {
          'User email not set': {
            description: $t('error_claim_free_book_email_not_set'),
            actions: [
              {
                label: $t('contact_cs'),
                onClick: async () => {
                  intercom.show()
                },
              },
            ],
          },
        },
      })
    }
    finally {
      blockingModal.close()
      isLoading.value = false
    }
  }

  function reset() {
    nftClassIds.value = []
    isLoading.value = false
  }

  return {
    nftClassIds: readonly(nftClassIds),
    isLoading: readonly(isLoading),
    count: readonly(count),
    fetchClaimableFreeBooks,
    claimFreeBook,
    reset,
  }
}
