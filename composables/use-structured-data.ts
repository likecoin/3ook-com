export function useStructuredData({ nftClassId }: { nftClassId: string }) {
  const bookInfo = useBookInfo({ nftClassId })

  function generateBookStructuredData({
    canonicalURL,
    selectedPricingItemIndex = 0,
    image, // TODO: we need image because normalizeURIToHTTP is broken in this context
  }: {
    canonicalURL: string
    selectedPricingItemIndex?: number
    image?: string
  }) {
    const name = bookInfo.name.value
    const description = bookInfo.description.value
    const authorName = bookInfo.authorName.value
    const publisherName = bookInfo.publisherName.value
    const datePublished = bookInfo.formattedPublishedDate.value
    const rawKeywords = bookInfo.keywords.value
    const keywords = Array.isArray(rawKeywords) ? rawKeywords.join(',') : rawKeywords
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value

    const pricingItems = bookInfo.pricingItems.value
    const selectedPricing = pricingItems[selectedPricingItemIndex]

    const productId = `${nftClassId}-${selectedPricingItemIndex}`
    const skuId = productId

    const productStructuredData = {
      '@context': 'https://schema.org',
      '@type': ['Book', 'Product'],
      '@id': `@${productId}`,
      'url': `${canonicalURL}?price_index=${selectedPricingItemIndex}`,
      'name': selectedPricing?.name ? `${name} - ${authorName} - ${selectedPricing.name}` : `${name} - ${authorName}`,
      image,
      description,
      'author': authorName,
      'sku': skuId,
      'publisher': publisherName,
      isbn,
      inLanguage,
      datePublished,
      keywords,
      'bookFormat': 'https://schema.org/EBook',
      'bookEdition': selectedPricing?.name,
      'offers': {
        '@context': 'https://schema.org',
        '@type': 'Offer',
        'seller': {
          '@context': 'https://schema.org',
          '@type': 'Person',
          'identifier': bookInfo.nftClassOwnerWalletAddress.value,
        },
        'price': selectedPricing?.price || 0,
        'priceCurrency': 'USD',
        'availability': selectedPricing?.isSoldOut ? 'SoldOut' : 'LimitedAvailability',
        'itemCondition': 'https://schema.org/NewCondition',
      },
      productId,
      'inProductGroupWithID': nftClassId,
    }

    const productGroupStructuredData = {
      '@context': 'https://schema.org',
      '@type': ['Book', 'ProductGroup'],
      'url': canonicalURL,
      'name': `${name} - ${authorName}`,
      image,
      description,
      'author': authorName,
      'sku': nftClassId,
      'publisher': publisherName,
      isbn,
      inLanguage,
      datePublished,
      keywords,
      'bookFormat': 'https://schema.org/EBook',
      'productGroupID': nftClassId,
      'workExample': [
        {
          '@id': `@${productId}`,
        },
      ],
      'hasVariant': [
        {
          '@id': `@${productId}`,
        },
      ],
      'variesBy': ['https://schema.org/BookEdition'],
    }

    return [productStructuredData, productGroupStructuredData]
  }

  return {
    generateBookStructuredData,
  }
}
