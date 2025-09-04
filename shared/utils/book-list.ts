import { checksumAddress } from 'viem'

export function getBookListItemId(nftClassId: string, priceIndex: number): string {
  return `${checksumAddress(nftClassId as `0x${string}`)}-${priceIndex}`
}

const CHECKOUT_BOOK_LIST_KEY = '3ook_list_checkout'

export function saveCheckoutBookList(items: BookListItem[]) {
  if (!import.meta.client || !window.sessionStorage) return

  try {
    sessionStorage.setItem(CHECKOUT_BOOK_LIST_KEY, JSON.stringify(items))
  }
  catch (error) {
    console.error('Failed to save checkout data to session storage', error)
  }
}

export function getCheckoutBookListItems(): BookListItem[] {
  if (!import.meta.client || !window.sessionStorage) return []

  try {
    const checkoutBookListDataString = sessionStorage.getItem(CHECKOUT_BOOK_LIST_KEY)
    if (!checkoutBookListDataString) return []

    return JSON.parse(checkoutBookListDataString) as BookListItem[]
  }
  catch (error) {
    console.error('Failed to parse checkout book list data from session storage', error)
    clearCheckoutBookList()
    return []
  }
}

export function clearCheckoutBookList() {
  if (!import.meta.client || !window.sessionStorage) return

  try {
    sessionStorage.removeItem(CHECKOUT_BOOK_LIST_KEY)
  }
  catch (error) {
    console.error('Failed to clear checkout data from session storage', error)
  }
}
