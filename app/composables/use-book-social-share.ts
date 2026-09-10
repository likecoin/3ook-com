interface BookSocialShareOptions {
  nftClassId: Ref<string>
  bookName: Ref<string>
  authorName: Ref<string>
  canonicalURL: Ref<string>
  from: Ref<string | undefined>
  priceIndex: Ref<number>
  selectedPricingItemIndex: Ref<number>
  isLibrary: Ref<boolean>
}

// Social share buttons for a book product page.
export function useBookSocialShare(options: BookSocialShareOptions) {
  const {
    nftClassId,
    bookName,
    authorName,
    canonicalURL,
    from,
    priceIndex,
    selectedPricingItemIndex,
    isLibrary,
  } = options

  const config = useRuntimeConfig()
  const { t: $t } = useI18n()
  const { user } = useUserSession()

  function getShortLink(utmSource: string) {
    // The logged-in sharer takes the affiliate credit over the original `?from=@likerId`
    const likerId = user.value?.likerId || parseLikerIdHandle(from.value)
    const slug = formatShortLinkSlug({
      nftClassId: nftClassId.value,
      priceIndex: priceIndex.value,
      likerId,
      utmSource,
    })
    if (!slug) return ''
    const shortURL = new URL(`${config.public.baseURL}/${isLibrary.value ? 'l' : 's'}/${slug}`)
    // A utm_source that cannot be encoded into the slug falls back to the query string
    if (utmSource && !getUTMSourceCode(utmSource)) {
      shortURL.searchParams.set('utm_source', utmSource)
    }
    return shortURL.toString()
  }

  function getShareURL(utmSource: string) {
    const shortLink = getShortLink(utmSource)
    if (shortLink) return shortLink

    // Fallback
    const url = new URL(canonicalURL.value)
    url.searchParams.set('utm_source', utmSource)
    url.searchParams.set('utm_medium', 'social')
    url.searchParams.set('utm_campaign', 'share')
    if (from.value) {
      url.searchParams.set('from', from.value)
    }
    return url.toString()
  }

  const shareText = computed(() => (authorName.value
    ? $t('product_page_share_text_with_author', { title: bookName.value, author: authorName.value })
    : $t('product_page_share_text', { title: bookName.value })))

  return useSocialShare({
    getShareURL,
    shareText,
    logEventItemId: computed(() => `${nftClassId.value}-${selectedPricingItemIndex.value}`),
  })
}
