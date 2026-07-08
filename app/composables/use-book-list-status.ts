import { useDebounceFn } from '@vueuse/core'

interface BookListStatusOptions {
  nftClassId: Ref<string>
  // Store-facing price index of the selected edition.
  priceIndex: Ref<number>
  bookName: Ref<string>
  getLogPayload: () => Record<string, unknown>
}

// Book list (save-for-later wishlist) status and toggle for a product page.
export function useBookListStatus(options: BookListStatusOptions) {
  const {
    nftClassId,
    priceIndex,
    bookName,
    getLogPayload,
  } = options

  const { t: $t } = useI18n()
  const toast = useToast()
  const { handleError } = useErrorHandler()
  const localeRoute = useLocaleRoute()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const accountStore = useAccountStore()
  const bookListStore = useBookListStore()

  const isInBookList = ref(false)
  const isCheckingBookList = ref(false)
  const isUpdatingBookList = ref(false)

  async function checkBookListStatus() {
    if (!hasLoggedIn.value) {
      isInBookList.value = false
      return
    }

    if (isCheckingBookList.value) return

    isCheckingBookList.value = true
    try {
      isInBookList.value = await bookListStore.checkItemExists(
        nftClassId.value,
        priceIndex.value,
      )
    }
    catch (error) {
      // Silent error
      console.error(error)
    }
    finally {
      isCheckingBookList.value = false
    }
  }

  const checkBookListStatusDebounced = useDebounceFn(checkBookListStatus, 100)

  // Watch for login status and selected edition changes
  watch([hasLoggedIn, priceIndex], checkBookListStatusDebounced)

  async function handleBookListButtonClick() {
    if (!hasLoggedIn.value) {
      await accountStore.login()
      if (!hasLoggedIn.value) return
    }

    if (isUpdatingBookList.value) {
      return // Prevent multiple simultaneous calls
    }

    isUpdatingBookList.value = true

    if (isInBookList.value) {
      // Remove from book list
      useLogEvent('remove_from_cart', getLogPayload())
      try {
        await bookListStore.removeItem(
          nftClassId.value,
          priceIndex.value,
        )
        isInBookList.value = false
        toast.add({
          title: $t('book_list_item_removed_toast_description'),
          description: bookName.value,
          icon: 'i-material-symbols-heart-broken',
          color: 'secondary',
        })
      }
      catch (error) {
        await handleError(error, {
          title: $t('error_book_list_remove'),
          logPrefix: 'product_page_book_list_remove',
        })
      }
    }
    else {
      // Add to book list (a save-for-later wishlist, not the checkout cart)
      useLogEvent('add_to_wishlist', getLogPayload())
      try {
        await bookListStore.addItem(
          nftClassId.value,
          priceIndex.value,
        )
        isInBookList.value = true
        toast.add({
          title: $t('book_list_item_added_toast_description'),
          description: bookName.value,
          icon: 'i-material-symbols-shopping-bag',
          color: 'success',
          actions: [
            {
              label: $t('book_list_added_toast_view_button_label'),
              variant: 'outline',
              onClick: () => {
                navigateTo(localeRoute({ name: 'list' }))
              },
            },
          ],
        })
      }
      catch (error) {
        await handleError(error, {
          title: $t('error_book_list_add'),
          logPrefix: 'product_page_book_list_add',
        })
      }
    }

    isUpdatingBookList.value = false
  }

  const handleBookListButtonClickDebounced = useDebounceFn(handleBookListButtonClick, 300)

  return {
    isInBookList,
    isCheckingBookList,
    isUpdatingBookList,
    checkBookListStatus,
    handleBookListButtonClickDebounced,
  }
}
