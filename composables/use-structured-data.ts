export function useStructuredData({ nftClassId }: { nftClassId: string }) {
  const bookInfo = useBookInfo({ nftClassId })

  function generateBookStructuredData({
    canonicalURL,
    image, // TODO: we need image because normalizeURIToHTTP with useRuntimeConfig() is broken in this context
  }: {
    canonicalURL: string
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
    const productsStructuredData = pricingItems.map((pricing) => {
      const productId = `${nftClassId}-${pricing.index}`
      const skuId = productId

      return {
        '@context': 'https://schema.org',
        '@type': ['Book', 'Product'],
        '@id': `${canonicalURL}?price_index=${pricing.index}`,
        'url': `${canonicalURL}?price_index=${pricing.index}`,
        'name': pricing?.name ? `${name} - ${authorName} - ${pricing.name}` : `${name} - ${authorName}`,
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
        'bookEdition': pricing?.name,
        'offers': {
          '@context': 'https://schema.org',
          '@type': 'Offer',
          'seller': {
            '@context': 'https://schema.org',
            '@type': 'Person',
            'identifier': bookInfo.nftClassOwnerWalletAddress.value,
          },
          'price': pricing?.price || 0,
          'priceCurrency': 'USD',
          'availability': pricing?.isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/LimitedAvailability',
          'itemCondition': 'https://schema.org/NewCondition',
        },
        productId,
        'inProductGroupWithID': nftClassId,
      }
    })

    const workExamples = productsStructuredData.map(product => ({
      '@id': product['@id'],
    }))

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
      'workExample': workExamples,
      'hasVariant': workExamples,
      'variesBy': ['https://schema.org/BookEdition'],
    }

    return [...productsStructuredData, productGroupStructuredData]
  }

  return {
    generateBookStructuredData,
  }
}
