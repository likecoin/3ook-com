const CART_SIZE_LIMIT = 100
const STORAGE_KEY = '3ook_com_shopping_cart'

export const useShoppingCartStore = defineStore('shopping-cart', () => {
  const toast = useToast()
  const { t: $t } = useI18n()
  const { getCurrencySymbol, formatPrice } = useCurrency()

  const itemsByIdMap = ref<Map<string, CartItem>>(new Map<string, CartItem>())

  const items = computed(() => [...itemsByIdMap.value.values()])

  const count = computed(() => items.value.reduce((acc, item) => acc + (item.quantity || 1), 0))

  const totalPrice = computed(() => {
    return items.value.reduce((acc, item) => {
      const price = item.price || 0
      const quantity = item.quantity || 1
      return acc + (price * quantity)
    }, 0)
  })

  const formattedTotalPrice = computed(() => formatPrice(totalPrice.value))

  const totalPriceCurrency = computed(() => getCurrencySymbol(totalPrice.value))

  function saveItemsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
    }
    catch (error) {
      console.warn('Failed to save shopping cart to local storage', error)
    }
  }

  function loadItemsFromStorage() {
    let cartItems
    try {
      const cartJSON = localStorage.getItem(STORAGE_KEY)
      if (!cartJSON) return

      cartItems = JSON.parse(cartJSON)
      if (Array.isArray(cartItems)) {
        cartItems.forEach((item: CartItem) => {
          itemsByIdMap.value.set(item.nftClassId, item)
        })
      }
      else {
        console.warn('Invalid shopping cart format in local storage')
      }
    }
    catch (error) {
      console.warn('Failed to load shopping cart from local storage', error)
    }
  }

  function addItem(item: CartItem) {
    if (count.value >= CART_SIZE_LIMIT) {
      toast.add({
        description: $t('cart_full_error'),
        icon: 'i-material-symbols-error',
        color: 'warning',
      })
      return false
    }

    const existingItem = itemsByIdMap.value.get(item.nftClassId)
    if (!existingItem || existingItem.priceIndex !== item.priceIndex) {
      itemsByIdMap.value.set(item.nftClassId, {
        ...item,
        timestamp: Date.now(),
      })
    }
    else {
      // NOTE: If the item already exists with the same priceIndex, update its quantity
      itemsByIdMap.value.set(item.nftClassId, {
        ...item,
        quantity: (existingItem.quantity || 0) + (item.quantity || 1),
      })
    }

    saveItemsToStorage()

    return true
  }

  function removeItemByNFTClassId(nftClassId: string) {
    itemsByIdMap.value.delete(nftClassId)

    saveItemsToStorage()
  }

  function clearCart() {
    itemsByIdMap.value.clear()
    saveItemsToStorage()
  }

  return {
    itemsByIdMap,

    items,
    count,

    totalPrice,
    formattedTotalPrice,
    totalPriceCurrency,

    addItem,
    removeItemByNFTClassId,
    saveItemsToStorage,
    loadItemsFromStorage,
    clearCart,
  }
})
