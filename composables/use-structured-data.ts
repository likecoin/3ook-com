export function useStructuredData({ nftClassId }: { nftClassId: string }) {
  const bookInfo = useBookInfo({ nftClassId })

  function generateOGMetaTags({
    selectedPricingItemIndex = 0,
  }) {
    const authorName = bookInfo.authorName.value
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value
    const nftClassOwnerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value

    const pricingItems = bookInfo.pricingItems.value
    const pricingItem = pricingItems[selectedPricingItemIndex]
    if (!pricingItem) {
      return []
    }
    const meta = [{
      property: 'og:price:amount',
      content: pricingItem.price,
    },
    {
      property: 'product:price:amount',
      content: pricingItem.price,
    },
    {
      property: 'og:price:currency',
      content: 'USD',
    },
    {
      property: 'product:price:currency',
      content: 'USD',
    },
    {
      property: 'og:availability',
      content: pricingItem.isSoldOut ? 'out of stock' : 'in stock',
    },
    {
      property: 'product:brand',
      content: '3ook',
    },
    {
      property: 'product:catalog_id',
      content: `${nftClassId}-${pricingItem.index}`,
    },
    {
      property: 'product:retailer_item_id',
      content: `${nftClassId}-${pricingItem.index}`,
    },
    {
      property: 'product:category',
      content: 543542, // ebook
    },
    {
      hid: 'product:condition',
      property: 'product:condition',
      content: 'new',
    },
    {
      hid: 'product:custom_label_0',
      property: 'product:custom_label_0',
      content: nftClassOwnerWalletAddress,
    }]
    if (isbn) {
      meta.push({
        hid: 'product:isbn',
        property: 'product:isbn',
        content: isbn,
      })
    }
    if (authorName) {
      meta.push({
        hid: 'product:custom_label_1',
        property: 'product:custom_label_1',
        content: authorName,
      })
    }
    if (inLanguage) {
      meta.push({
        property: 'product:locale',
        content: inLanguage,
      })
    }
    return meta
  }

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
    generateOGMetaTags,
    generateBookStructuredData,
  }
}
