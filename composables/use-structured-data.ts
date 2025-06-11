export function useStructuredData({ nftClassId }: { nftClassId: string }) {
  const bookInfo = useBookInfo({ nftClassId })

  function generateBookStructuredData({
    canonicalUrl,
    selectedPricingItemIndex = 0,
    image, // TODO: we need image because normalizeURIToHTTP is broken in this context
  }: {
    canonicalUrl: string
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

    const productID = `${nftClassId}-${selectedPricingItemIndex}`
    const skuID = productID

    const productStructuredData = {
      '@context': 'http://www.schema.org',
      '@type': ['Book', 'Product'],
      '@id': `@${productID}`,
      'url': `${canonicalUrl}?price_index=${selectedPricingItemIndex}`,
      'name': selectedPricing?.name ? `${name} - ${authorName} - ${selectedPricing.name}` : `${name} - ${authorName}`,
      image,
      description,
      'author': authorName,
      'sku': skuID,
      'publisher': publisherName,
      isbn,
      inLanguage,
      datePublished,
      keywords,
      'bookFormat': 'https://schema.org/EBook',
      'bookEdition': selectedPricing?.name || '',
      'offers': {
        '@context': 'http://www.schema.org',
        '@type': 'Offer',
        'seller': {
          '@context': 'http://www.schema.org',
          '@type': 'Person',
          'identifier': bookInfo.nftClassOwnerWalletAddress.value,
        },
        'price': selectedPricing?.price || 0,
        'priceCurrency': 'USD',
        'availability': selectedPricing?.isSoldOut ? 'SoldOut' : 'LimitedAvailability',
        'itemCondition': 'https://schema.org/NewCondition',
      },
      productID,
      'inProductGroupWithID': nftClassId,
    }

    const productGroupStructuredData = {
      '@context': 'https://schema.org',
      '@type': ['Book', 'ProductGroup'],
      'url': canonicalUrl,
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
          '@id': `@${productID}`,
        },
      ],
      'hasVariant': [
        {
          '@id': `@${productID}`,
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
