export function useStructuredData({ nftClassId }: { nftClassId: string }) {
  const bookInfo = useBookInfo({ nftClassId })
  const config = useRuntimeConfig()

  function generateOGMetaTags({
    selectedPricingItemIndex = 0,
  }) {
    const authorName = bookInfo.authorName.value
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value
    const nftClassOwnerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value

    const pricingItems = bookInfo.pricingItems.value
    const pricingItem = pricingItems[selectedPricingItemIndex]
    if (!pricingItem || bookInfo.isHidden.value) {
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
      property: 'product:availability',
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
      property: 'item_group_id',
      content: nftClassId,
    },
    {
      property: 'product:category',
      content: 543542, // ebook
    },
    {
      property: 'product:condition',
      content: 'new',
    },
    {
      property: 'product:custom_label_0',
      content: nftClassOwnerWalletAddress,
    },
    {
      property: 'product:brand',
      content: '3ook',
    },
    {
      property: 'og:type',
      content: 'product',
    }]
    if (isbn) {
      meta.push({
        property: 'product:gtin',
        content: isbn,
      })
      meta.push({
        property: 'product:isbn',
        content: isbn,
      })
    }
    if (authorName) {
      meta.push({
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
    if (bookInfo.isHidden.value) {
      return []
    }

    const baseURL = config.public.baseURL

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
        'brand': {
          '@context': 'https://schema.org',
          '@type': 'Brand',
          'name': '3ook',
        },
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
          'url': `${canonicalURL}?price_index=${pricing.index}`,
          'price': pricing?.price || 0,
          'priceCurrency': 'USD',
          'availability': pricing?.isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/LimitedAvailability',
          'itemCondition': 'https://schema.org/NewCondition',
          'checkoutPageURLTemplate': `${baseURL}/checkout?products=${productId}&utm_medium=structured-data`,
          'shippingDetails': {
            '@type': 'OfferShippingDetails',
            'shippingRate': pricing.hasShipping
              ? {
                  '@type': 'MonetaryAmount',
                  'value': 10,
                  'currency': 'USD',
                }
              : {
                  '@type': 'MonetaryAmount',
                  'value': 0,
                  'currency': 'USD',
                },
            'deliveryTime': {
              '@type': 'ShippingDeliveryTime',
              'handlingTime': pricing.hasShipping
                ? {
                    '@type': 'QuantitativeValue',
                    'minValue': 1,
                    'maxValue': 7,
                    'unitCode': 'DAY',
                  }
                : {
                    '@type': 'QuantitativeValue',
                    'minValue': 0,
                    'maxValue': 0,
                    'unitCode': 'DAY',
                  },
              'transitTime': (pricing.hasShipping || pricing.isAutoDeliver)
                ? {
                    '@type': 'QuantitativeValue',
                    'minValue': 1,
                    'maxValue': 7,
                    'unitCode': 'DAY',
                  }
                : {
                    '@type': 'QuantitativeValue',
                    'minValue': 0,
                    'maxValue': 0,
                    'unitCode': 'DAY',
                  },
            },
          },
          'hasMerchantReturnPolicy': {
            '@type': 'MerchantReturnPolicy',
            'returnPolicyCategory': 'https://schema.org/MerchantReturnNotPermitted',
          },
        },
        'productID': productId,
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
      'brand': {
        '@context': 'https://schema.org',
        '@type': 'Brand',
        'name': '3ook',
      },
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
