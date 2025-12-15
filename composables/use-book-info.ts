export default function (
  { nftClassId }: { nftClassId: string | Ref<string> | ComputedRef<string> },
) {
  const { t: $t } = useI18n()
  const localeRoute = useLocaleRoute()
  const localeString = useLocaleString()
  const metadataStore = useMetadataStore()
  const bookstoreStore = useBookstoreStore()
  const bookInfo = useEVMBookInfo({ nftClassId })
  const bookshelfStore = useBookshelfStore()
  const { normalizeURIToHTTP } = useURIParser()

  const bookstoreInfo = computed(() => {
    return bookstoreStore.getBookstoreInfoByNFTClassId(toValue(nftClassId))
  })

  const nftClassOwnerWalletAddress = computed(() => bookstoreInfo.value?.ownerWallet || '')
  const nftClassOwnerName = computed(() => {
    return metadataStore.getLikerInfoByWalletAddress(nftClassOwnerWalletAddress.value)?.displayName || ''
  })

  const nftClassOwnerAvatar = computed(() => {
    return metadataStore.getLikerInfoByWalletAddress(nftClassOwnerWalletAddress.value)?.avatarSrc || ''
  })

  const authorName = computed(() => {
    const author = bookInfo.author.value
    if (typeof author === 'string') return author
    if (typeof author === 'object' && 'name' in author) return author.name
    return ''
  })

  const description = computed(() => {
    return bookstoreInfo.value?.descriptionFull || bookstoreInfo.value?.description || ''
  })

  const descriptionSummary = computed(() => {
    return bookstoreInfo.value?.descriptionSummary || ''
  })

  const authorDescription = computed(() => {
    const author = bookInfo.author.value
    if (typeof author === 'object' && 'description' in author) return author.description
    return ''
  })

  const publisherName = computed(() => bookInfo.publisher.value)

  const formattedPublishedDate = computed(() => {
    return bookInfo.publishedDate.value?.toISOString().split('T')[0] || ''
  })

  const readActionEntryPoints = computed<ContentURL[]>(() => {
    const potentialAction = bookInfo.potentialAction.value
    let readAction: ReadAction | undefined
    if (potentialAction && potentialAction['@type'] === 'ReadAction') {
      readAction = potentialAction as ReadAction
    }
    let entryPoints: ReadActionEntryPoint[] = []
    if (readAction) {
      entryPoints = readAction.target || []
    }
    return entryPoints.map((entryPoint, index) => {
      const { contentType, url, name } = entryPoint
      return {
        url: normalizeURIToHTTP(url),
        name,
        type: extractContentTypeFromURL(contentType),
        index,
      }
    })
  })

  const contentURLs = computed<ContentURL[]>(() => {
    if (readActionEntryPoints.value.length) {
      return readActionEntryPoints.value
    }
    return bookInfo.sameAs.value.map((url: string, index: number) => ({
      url: normalizeURIToHTTP(url),
      name: extractFilenameFromContentURL(url),
      type: extractContentTypeFromURL(url),
      index,
    }))
  })

  const sortedContentURLs = computed(() => {
    return [...contentURLs.value].sort(compareContentURL)
  })

  const defaultContentURL = computed(() => {
    return contentURLs.value.find(url => url.type === 'epub') || contentURLs.value[0]
  })

  const getReaderRoute = computed(() => ({
    nftId,
    contentURL: inputContentURL,
    shouldCustomMessageDisabled = false,
  }: {
    nftId?: string
    contentURL?: ContentURL
    shouldCustomMessageDisabled?: boolean
  }) => {
    const contentURL = inputContentURL || defaultContentURL.value
    if (!contentURL) return undefined

    const { type, index } = contentURL
    const query: Record<string, string | number> = {
      nft_class_id: toValue(nftClassId).toLowerCase(),
      index: index,
    }
    if (nftId !== undefined) {
      // NOTE: Reader will fetch nftId from the current user if not provided
      query.nft_id = nftId
    }
    if (shouldCustomMessageDisabled) {
      query.custom_message = '0'
    }
    return localeRoute({
      name: `reader-${type}`,
      query,
    })
  })

  const inLanguage = computed(() => {
    return bookstoreInfo.value?.inLanguage || bookInfo.inLanguage.value || 'zh'
  })

  const contentTypes = computed(() => {
    const types = contentURLs.value.map(({ type }) => type)
    return [...new Set(types.filter(type => type !== 'unknown'))]
  })

  const formattedContentTypes = computed(() => contentTypes.value.map((type) => {
    switch (type) {
      case 'pdf':
        return 'PDF'
      case 'epub':
        return 'EPUB'
      default:
        return $t('other_file_type')
    }
  }).join($t('text_separator_comma')))

  const isHidden = computed(() => {
    return bookstoreInfo.value?.isHidden || false
  })

  const isApprovedForSale = computed(() => {
    return bookstoreInfo.value?.isApprovedForSale || false
  })

  const isApprovedForIndexing = computed(() => {
    return bookstoreInfo.value?.isApprovedForIndexing || false
  })

  const isApprovedForAds = computed(() => {
    return bookstoreInfo.value?.isApprovedForAds || false
  })

  const isCustomMessageEnabled = computed(() => {
    return bookstoreInfo.value?.enableCustomMessagePage || false
  })

  const isDownloadable = computed(() => {
    return !bookstoreInfo.value?.hideDownload || false
  })

  const isAudioHidden = computed(() => {
    return bookstoreInfo.value?.hideAudio || false
  })

  const formattedReadingMethods = computed(() => {
    const methods = [$t('reading_method_read_online')]
    if (isDownloadable.value) {
      methods.push($t('reading_method_download_file'))
    }
    return methods.join($t('text_separator_slash'))
  })

  const formattedTTSSupportLabel = computed(() => {
    return isAudioHidden.value ? $t('product_page_tts_disabled') : $t('product_page_tts_enabled')
  })

  const keywords = computed(() => {
    return bookstoreInfo.value?.keywords.filter(keyword => !!keyword) || []
  })

  const pricingItems = computed(() => {
    return (bookstoreInfo.value?.prices || [])
      .filter(item => !item.isUnlisted)
      .map((item) => {
        return {
          index: item.index,
          name: localeString(item.name),
          description: localeString(item.description),
          price: item.price,
          currency: item.price > 0 ? 'USD' : '',
          isSoldOut: item.isSoldOut,
          canTip: item.isAllowCustomPrice && item.isTippingEnabled,
          isAutoDeliver: item.isAutoDeliver,
        }
      })
  })

  const minPrice = computed(() => {
    if (!pricingItems.value.length) return 0
    return Math.min(...pricingItems.value.map(item => item.price))
  })

  const userOwnedNFTIds = computed(() => {
    return bookshelfStore.getTokenIdsByNFTClassId(toValue(nftClassId))
  })

  const firstUserOwnedNFTId = computed(() => userOwnedNFTIds.value[0])

  const authorPageRoute = computed(() => getAuthorPageRoute())

  function getAuthorPageRoute(options?: { llMedium?: string, llSource?: string }) {
    const query: Record<string, string> = {
      author: authorName.value,
    }

    if (options?.llMedium) {
      query.ll_medium = options.llMedium
    }

    if (options?.llSource) {
      query.ll_source = options.llSource
    }

    return localeRoute({
      name: 'store',
      query,
    })
  }

  const productPageRoute = computed(() => getProductPageRoute())

  function getProductPageRoute(options?: { llMedium?: string, llSource?: string, hash?: string }) {
    const query: Record<string, string> = {}

    if (options?.llMedium) {
      query.ll_medium = options.llMedium
    }

    if (options?.llSource) {
      query.ll_source = options.llSource
    }

    return localeRoute({
      name: 'store-nftClassId',
      params: { nftClassId: toValue(nftClassId) },
      query: Object.keys(query).length > 0 ? query : undefined,
      hash: options?.hash,
    })
  }

  function getIsAutoDelivery(index?: number) {
    return bookstoreInfo.value?.prices.find(item => item.index === index)?.isAutoDeliver || false
  }

  return {
    ...bookInfo,

    nftClassOwnerWalletAddress,
    nftClassOwnerName,
    authorName,
    authorDescription,
    publisherName,
    formattedPublishedDate,
    nftClassOwnerAvatar,
    description,
    descriptionSummary,
    inLanguage,

    contentURLs,
    sortedContentURLs,
    defaultContentURL,
    contentTypes,
    formattedContentTypes,

    bookstoreInfo,
    isCustomMessageEnabled,
    isHidden,
    isApprovedForSale,
    isApprovedForIndexing,
    isApprovedForAds,
    isDownloadable,
    isAudioHidden,
    formattedTTSSupportLabel,
    formattedReadingMethods,
    keywords,

    pricingItems,
    minPrice,

    userOwnedNFTIds,
    firstUserOwnedNFTId,

    authorPageRoute,
    getAuthorPageRoute,
    productPageRoute,
    getProductPageRoute,
    getReaderRoute,

    getIsAutoDelivery,
  }
}
