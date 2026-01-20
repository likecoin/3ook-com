export function useMemberProgramStructuredData() {
  const { t: $t } = useI18n()
  const config = useRuntimeConfig()
  const baseURL = config.public.baseURL
  const subscription = useSubscription()
  const {
    yearlyPrice,
    monthlyPrice,
    currency,
  } = subscription

  const memberProgramTiers = computed(() => [
    {
      '@type': 'MemberProgramTier',
      'name': 'Monthly',
      'memberProgram': {
        '@type': 'MemberProgram',
        'name': '3ook.com Plus',
      },
    },
    {
      '@type': 'MemberProgramTier',
      'name': 'Yearly',
      'memberProgram': {
        '@type': 'MemberProgram',
        'name': '3ook.com Plus',
      },
    },
  ])

  const memberProgramData = computed(() => ({
    '@type': 'MemberProgram',
    'name': '3ook.com Plus',
    'description': $t('pricing_page_subscription_description'),
    'url': `${baseURL}/member`,
    'hasTiers': [
      {
        '@type': 'MemberProgramTier',
        'name': 'Monthly',
        'url': `${baseURL}/member`,
        'hasTierBenefit': [
          'https://schema.org/TierBenefitLoyaltyPrice',
        ],
        'hasTierRequirement': {
          '@type': 'UnitPriceSpecification',
          'price': monthlyPrice.value,
          'priceCurrency': currency.value,
          'billingDuration': 'P1M',
          'name': $t('pricing_page_monthly'),
        },
      },
      {
        '@type': 'MemberProgramTier',
        'name': 'Yearly',
        'url': `${baseURL}/member`,
        'hasTierBenefit': [
          'https://schema.org/TierBenefitLoyaltyPrice',
        ],
        'hasTierRequirement': {
          '@type': 'UnitPriceSpecification',
          'price': yearlyPrice.value,
          'priceCurrency': currency.value,
          'billingDuration': 'P1Y',
          'name': $t('pricing_page_yearly'),
        },
      },
    ],
  }))

  return {
    memberProgramData,
    memberProgramTiers,
  }
}

function generateBookOffer({
  sellerWalletAddress,
  canonicalURL,
  priceIndex,
  price,
  isSoldOut,
  isAutoDeliver,
  productId,
  baseURL,
  validForMemberTier,
}: {
  sellerWalletAddress?: string
  canonicalURL: string
  priceIndex: number
  price: number
  isSoldOut: boolean
  isAutoDeliver: boolean
  productId: string
  baseURL: string
  validForMemberTier?: Array<{
    '@type': string
    'name': string
    'memberProgram': {
      '@type': string
      'name': string
    }
  }>
}) {
  const offer: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    'seller': sellerWalletAddress
      ? {
          '@context': 'https://schema.org',
          '@type': 'Person',
          'identifier': sellerWalletAddress,
        }
      : undefined,
    'url': `${canonicalURL}?price_index=${priceIndex}`,
    'price': price,
    'priceCurrency': 'USD',
    'availability': isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/LimitedAvailability',
    'itemCondition': 'https://schema.org/NewCondition',
    'checkoutPageURLTemplate': `${baseURL}/checkout?products=${productId}&utm_medium=structured-data`,
    'shippingDetails': {
      '@type': 'OfferShippingDetails',
      'shippingRate': {
        '@type': 'MonetaryAmount',
        'value': 0,
        'currency': 'USD',
      },
      'deliveryTime': {
        '@type': 'ShippingDeliveryTime',
        'handlingTime': !isAutoDeliver
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
        'transitTime': {
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
  }

  if (validForMemberTier) {
    offer.validForMemberTier = validForMemberTier
  }

  return offer
}

function generateReadAction({
  urlTemplate,
  nftClassId,
  sellerWalletAddress,
  price,
  isSoldOut = false,
}: {
  urlTemplate: string
  nftClassId: string
  sellerWalletAddress?: string
  price?: number
  isSoldOut?: boolean
}) {
  const action: Record<string, unknown> = {
    '@type': 'ReadAction',
    'target': {
      '@type': 'EntryPoint',
      'urlTemplate': urlTemplate,
      'actionPlatform': [
        'https://schema.org/DesktopWebPlatform',
        'https://schema.org/AndroidPlatform',
        'https://schema.org/IOSPlatform',
      ],
    },
  }

  if (price !== undefined) {
    const productId = `${nftClassId}-${0}`
    const offer = generateBookOffer({
      sellerWalletAddress: sellerWalletAddress,
      canonicalURL: urlTemplate,
      priceIndex: 0,
      price,
      isSoldOut,
      isAutoDeliver: true,
      productId,
      baseURL: urlTemplate,
    })

    action.expectsAcceptanceOf = offer
  }

  return action
}

export function useStorePageStructuredData({
  items,
  canonicalURL,
  name,
  description,
}: {
  items: MaybeRefOrGetter<Array<{
    classId?: string
    title?: string
    imageUrl?: string
    minPrice?: number
  }>>
  canonicalURL: MaybeRefOrGetter<string>
  name: MaybeRefOrGetter<string>
  description?: MaybeRefOrGetter<string | undefined>
}) {
  const config = useRuntimeConfig()
  const baseURL = config.public.baseURL
  const bookstoreStore = useBookstoreStore()

  return computed(() => {
    const itemsValue = toValue(items)
    const canonicalURLValue = toValue(canonicalURL)
    const nameValue = toValue(name)
    const descriptionValue = toValue(description)

    const listItems = itemsValue
      .filter(item => item.classId && item.title)
      .map((item, index) => {
        const bookInfo = bookstoreStore.getBookstoreInfoByNFTClassId(item.classId!)
        const authorName = bookInfo?.author?.name || ''

        return {
          '@type': 'ListItem',
          'position': index + 1,
          'item': {
            '@type': 'Book',
            '@id': `${baseURL}/store/${item.classId}`,
            'url': `${baseURL}/store/${item.classId}`,
            'name': item.title,
            'image': item.imageUrl,
            ...(authorName && { author: authorName }),
            'bookFormat': 'https://schema.org/EBook',
            'potentialAction': generateReadAction({
              nftClassId: item.classId!,
              urlTemplate: `${baseURL}/store/${item.classId}`,
              price: item.minPrice,
            }),
          },
        }
      })

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'url': canonicalURLValue,
      'name': nameValue,
      ...(descriptionValue && { description: descriptionValue }),
      'numberOfItems': listItems.length,
      'itemListElement': listItems,
    }
  })
}

export function useStructuredData(
  { nftClassId }: { nftClassId: string | Ref<string> | ComputedRef<string> },
) {
  const bookInfo = useBookInfo({ nftClassId })
  const config = useRuntimeConfig()
  const { getPlusDiscountRate } = useSubscription()
  const { memberProgramTiers } = useMemberProgramStructuredData()
  function generateOGMetaTags({
    selectedPricingItemIndex = 0,
  }) {
    const nftClassIdValue = toValue(nftClassId)
    const authorName = bookInfo.authorName.value
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value
    const nftClassOwnerWalletAddress = bookInfo.nftClassOwnerWalletAddress.value

    const pricingItems = bookInfo.pricingItems.value
    const pricingItem = pricingItems[selectedPricingItemIndex]
    if (!pricingItem || bookInfo.isHidden.value || !bookInfo.isApprovedForAds.value) {
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
      content: '3ook.com',
    },
    {
      property: 'product:catalog_id',
      content: `${nftClassIdValue}-${pricingItem.index}`,
    },
    {
      property: 'product:retailer_item_id',
      content: `${nftClassIdValue}-${pricingItem.index}`,
    },
    {
      property: 'item_group_id',
      content: nftClassIdValue,
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
      content: '3ook.com',
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

  function generateBookStructuredData({ canonicalURL }: { canonicalURL: string }) {
    const nftClassIdValue = toValue(nftClassId)
    if (bookInfo.isHidden.value) {
      return []
    }

    const baseURL = config.public.baseURL

    const name = bookInfo.name.value
    const alternativeHeadline = bookInfo.alternativeHeadline.value
    const description = bookInfo.description.value
    const image = bookInfo.coverSrc.value
    const authorName = bookInfo.authorName.value
    const publisherName = bookInfo.publisherName.value
    const datePublished = bookInfo.formattedPublishedDate.value
    const rawKeywords = bookInfo.keywords.value
    const keywords = Array.isArray(rawKeywords) ? rawKeywords.join(',') : rawKeywords
    const isbn = bookInfo.isbn.value
    const inLanguage = bookInfo.inLanguage.value

    const pricingItems = bookInfo.pricingItems.value
    const productsStructuredData = pricingItems.map((pricing) => {
      const productId = `${nftClassIdValue}-${pricing.index}`
      const skuId = productId

      return {
        '@context': 'https://schema.org',
        '@type': ['Book', 'Product'],
        '@id': `${canonicalURL}?price_index=${pricing.index}`,
        'url': `${canonicalURL}?price_index=${pricing.index}`,
        'name': pricing?.name ? `${name} - ${authorName} - ${pricing.name}` : `${name} - ${authorName}`,
        alternativeHeadline,
        image,
        description,
        'brand': {
          '@context': 'https://schema.org',
          '@type': 'Brand',
          'name': '3ook.com',
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
        'offers': [
          // Regular offer for all users
          generateBookOffer({
            sellerWalletAddress: bookInfo.nftClassOwnerWalletAddress.value,
            canonicalURL,
            priceIndex: pricing.index,
            price: pricing?.price || 0,
            isSoldOut: pricing?.isSoldOut || false,
            isAutoDeliver: pricing.isAutoDeliver,
            productId,
            baseURL,
          }),
          ...(pricing?.price > 0 && getPlusDiscountRate()
            ? [generateBookOffer({
                sellerWalletAddress: bookInfo.nftClassOwnerWalletAddress.value,
                canonicalURL,
                priceIndex: pricing.index,
                price: pricing.price * getPlusDiscountRate(),
                isSoldOut: pricing?.isSoldOut || false,
                isAutoDeliver: pricing.isAutoDeliver,
                productId,
                baseURL,
                validForMemberTier: memberProgramTiers.value,
              })]
            : []),
        ],
        'potentialAction': generateReadAction({
          sellerWalletAddress: bookInfo.nftClassOwnerWalletAddress.value,
          nftClassId: nftClassIdValue,
          urlTemplate: `${baseURL}/store/${nftClassIdValue}`,
          price: pricing?.price || 0,
          isSoldOut: pricing?.isSoldOut || false,
        }),
        'productID': productId,
        'inProductGroupWithID': nftClassIdValue,
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
      alternativeHeadline,
      image,
      description,
      'brand': {
        '@context': 'https://schema.org',
        '@type': 'Brand',
        'name': '3ook.com',
      },
      'author': authorName,
      'sku': nftClassIdValue,
      'publisher': publisherName,
      isbn,
      inLanguage,
      datePublished,
      keywords,
      'bookFormat': 'https://schema.org/EBook',
      'productGroupID': nftClassIdValue,
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
